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
import type {
	Dimension,
	GraphData,
	GraphEdge,
	GraphNode,
	ImageMeta,
	ImagesIndex,
	Relation,
} from "../src/types/graph";

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

	// Seed positions before FA2 (it needs initial x/y on every node).
	graph.forEachNode((node, attrs) => {
		if (typeof attrs.x !== "number" || typeof attrs.y !== "number") {
			graph.mergeNodeAttributes(node, {
				x: Math.random() * 100 - 50,
				y: Math.random() * 100 - 50,
			});
		}
	});

	console.log("→ Running ForceAtlas2 (500 iterations)…");
	forceAtlas2.assign(graph, {
		iterations: 500,
		settings: {
			gravity: 1,
			scalingRatio: 10,
			strongGravityMode: false,
			barnesHutOptimize: true,
			adjustSizes: false,
			linLogMode: false,
			outboundAttractionDistribution: false,
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
