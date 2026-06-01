/**
 * Build-time GEXF → JSON converter.
 *
 *   data/grafo.gexf  →  public/data/graph.json
 *   data/input.csv?  →  public/data/images-index.json   (empty {} if missing)
 *
 * Runs ForceAtlas2 once so the client mounts with final coords.
 */
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import Graph from "graphology";
import gexf from "graphology-gexf";
import forceAtlas2 from "graphology-layout-forceatlas2";
import noverlap from "graphology-layout-noverlap";
import circular from "graphology-layout/circular";

import type {
	Dimension,
	GraphData,
	GraphEdge,
	GraphNode,
	ImageMeta,
	ImagesIndex,
	Relation,
} from "../src/types/graph";

// Mirrors `nodeSizeFromDegree` in src/lib/constants.ts so the layout
// (FA2 with adjustSizes + noverlap) reasons about the same radii Sigma renders.
function nodeSize(degree: number): number {
	return 6 + Math.log1p(degree) * 4;
}
const ROOT = process.cwd();
const GEXF_PATH = join(ROOT, "data", "grafo.gexf");
const CSV_PATH = join(ROOT, "data", "input.csv");
const IMAGES_DIR = join(ROOT, "public", "images-thumb");
const IMAGES_PUBLIC_PREFIX = "/images-thumb";
const OUT_DIR = join(ROOT, "public", "data");

function parseCsv(text: string): Record<string, string>[] {
	const lines = text.split(/\r?\n/).filter(Boolean);
	if (lines.length === 0) return [];
	const headers = splitCsvLine(lines[0]);
	return lines.slice(1).map((line) => {
		const values = splitCsvLine(line);
		return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
	});
}

function splitCsvLine(line: string): string[] {
	const out: string[] = [];
	let cur = "";
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const c = line[i];
		if (c === '"') {
			if (inQuotes && line[i + 1] === '"') {
				cur += '"';
				i++;
			} else inQuotes = !inQuotes;
		} else if (c === "," && !inQuotes) {
			out.push(cur);
			cur = "";
		} else cur += c;
	}
	out.push(cur);
	return out.map((s) => s.trim());
}

function main() {
	if (!existsSync(GEXF_PATH)) {
		throw new Error(`Missing GEXF: ${GEXF_PATH}`);
	}

	console.log("→ Parsing GEXF…");
	const gexfText = readFileSync(GEXF_PATH, "utf8");
	const graph: Graph = gexf.parse(Graph, gexfText);

	console.log(`  ${graph.order} nodes · ${graph.size} edges`);

	// 1. Deterministic circular seed → avoids the random-clump start that
	//    causes FA2 to settle into a dense central blob.
	console.log("→ Seeding with circular layout…");
	circular.assign(graph, { scale: Math.max(500, graph.order) });

	// 2. Pre-assign sizes so FA2 (adjustSizes) and noverlap respect them.
	graph.forEachNode((node, attrs) => {
		const degree = Number(attrs.degree_static ?? graph.degree(node));
		graph.setNodeAttribute(node, "size", nodeSize(degree));
	});

	// 3. ForceAtlas2 — tuned for multidimensional graphs with communities:
	//    - linLogMode: spreads communities into readable clusters
	//    - outboundAttractionDistribution: hubs don't absorb their neighbours
	//    - low gravity + high scalingRatio: less central collapse
	//    - adjustSizes: nodes repel based on their visual radius
	const inferred = forceAtlas2.inferSettings(graph);
	const fa2Iterations = graph.order > 1000 ? 2500 : 1500;
	console.log(`→ Running ForceAtlas2 (${fa2Iterations} iterations)…`);
	forceAtlas2.assign(graph, {
		iterations: fa2Iterations,
		settings: {
			...inferred,
			linLogMode: true,
			outboundAttractionDistribution: true,
			adjustSizes: true,
			gravity: 0.05,
			scalingRatio: 10,
			strongGravityMode: false,
			barnesHutOptimize: true,
			barnesHutTheta: 0.8,
			edgeWeightInfluence: 1,
			slowDown: 1,
		},
	});

	// 4. Anti-collision pass — eliminates residual node overlap without
	//    destroying the FA2 cluster structure. Ratio is derived from the
	//    layout's actual coordinate span so node sizes map into graph units.
	let minX = Infinity;
	let maxX = -Infinity;
	let minY = Infinity;
	let maxY = -Infinity;
	graph.forEachNode((_id, attrs) => {
		const x = Number(attrs.x);
		const y = Number(attrs.y);
		if (x < minX) minX = x;
		if (x > maxX) maxX = x;
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
	});
	const span = Math.max(maxX - minX, maxY - minY) || 1;
	const meanSpacing = span / Math.sqrt(graph.order);
	const noverlapRatio = meanSpacing / 30;
	console.log("→ Running noverlap (anti-collision)…");
	noverlap.assign(graph, {
		maxIterations: 200,
		settings: {
			ratio: noverlapRatio,
			margin: noverlapRatio * 2,
			expansion: 1.2,
			gridSize: 50,
			speed: 4,
		},
	});

	// Project nodes
	const nodes: GraphNode[] = [];
	graph.forEachNode((id, attrs) => {
		nodes.push({
			id,
			label: String(attrs.label ?? attrs.title ?? id),
			dimension: (attrs.dimension as Dimension) ?? "imagen",
			community: Number(attrs.community ?? 0),
			degree: Number(attrs.degree_static ?? graph.degree(id)),
			x: Number(attrs.x),
			y: Number(attrs.y),
			...(attrs.year != null ? { year: Number(attrs.year) } : {}),
			...(attrs.confianza != null
				? { confianza: Number(attrs.confianza) }
				: {}),
			...(attrs.n_fotos != null ? { n_fotos: Number(attrs.n_fotos) } : {}),
		});
	});

	const edges: GraphEdge[] = [];
	graph.forEachEdge((_id, attrs, source, target) => {
		edges.push({
			source,
			target,
			relation: (attrs.relation as Relation) ?? "mismo_año",
		});
	});

	const graphData: GraphData = { nodes, edges };

	// Build images-index — prefer CSV when available, otherwise fall back to
	// whatever images live in public/images-iaah (matched by filename = node id).
	const imagesIndex: ImagesIndex = {};

	if (existsSync(CSV_PATH)) {
		console.log("→ Reading input.csv…");
		const rows = parseCsv(readFileSync(CSV_PATH, "utf8"));
		for (const row of rows) {
			const filename = row.filename;
			if (!filename) continue;
			imagesIndex[filename] = {
				caption: row.caption ?? "",
				url: row.url ?? "",
				year_csv: Number(row.year) || 0,
				nom_fons: row.nom_fons ?? "",
				nom_arxiu: row.nom_arxiu ?? "",
				toponims: row.toponims ?? "",
				noms_propis: row.noms_propis ?? "",
			};
		}
		console.log(`  ${Object.keys(imagesIndex).length} image rows from CSV`);
	}

	if (existsSync(IMAGES_DIR)) {
		// The thumb dir stores `.webp` files; node ids are the original `.jpg`
		// filenames, so we strip the extension to match.
		const local = new Set(readdirSync(IMAGES_DIR));
		let matched = 0;
		graph.forEachNode((id, attrs) => {
			if ((attrs.dimension as Dimension) !== "imagen") return;
			const base = id.replace(/\.[^.]+$/, "");
			const thumbName = `${base}.webp`;
			if (!local.has(thumbName)) return;
			const existing = imagesIndex[id];
			const url = `${IMAGES_PUBLIC_PREFIX}/${thumbName}`;
			const next: ImageMeta = existing
				? { ...existing, url: existing.url || url }
				: {
						caption: "",
						url,
						year_csv: Number(attrs.year) || 0,
						nom_fons: "",
						nom_arxiu: "",
						toponims: "",
						noms_propis: "",
					};
			imagesIndex[id] = next;
			matched++;
		});
		console.log(
			`  ${matched} image nodes linked to thumbs in public/images-thumb/`,
		);
	} else {
		console.log(
			"  No public/images-thumb/ — run `npm run optimize:images` to generate thumbs",
		);
	}

	mkdirSync(OUT_DIR, { recursive: true });
	writeFileSync(join(OUT_DIR, "graph.json"), JSON.stringify(graphData));
	writeFileSync(
		join(OUT_DIR, "images-index.json"),
		JSON.stringify(imagesIndex),
	);
	console.log(
		`✓ Wrote ${OUT_DIR}/graph.json (${graphData.nodes.length} nodes, ${graphData.edges.length} edges)`,
	);
	console.log(`✓ Wrote ${OUT_DIR}/images-index.json`);
}

main();
