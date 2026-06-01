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
import random from "graphology-layout/random";

import type {
	Dimension,
	GraphData,
	GraphEdge,
	GraphNode,
	ImageMeta,
	ImagesIndex,
	Relation,
} from "../src/types/graph";

// Mirrors `nodeSize` in src/lib/constants.ts so the layout (FA2 with
// adjustSizes + noverlap) reasons about the same radii Sigma renders.
// Per-dimension curves create a content hierarchy: photos > years > clothing > words.
function nodeSize(dimension: Dimension, degree: number): number {
	const d = Math.max(0, degree);
	switch (dimension) {
		case "imagen":
			return 7 + Math.log1p(d) * 2.5;
		case "año":
			return 8 + Math.log1p(d) * 1.6;
		case "vestimenta":
			return 4 + Math.log1p(d) * 1.0;
		case "transcripcion":
			return 3 + Math.log1p(d) * 0.8;
	}
}

// Deterministic PRNG (mulberry32) so the random seed — and therefore the
// final node positions — are reproducible across builds.
function seededRandom(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
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

	// 1. Random seed (Gephi-style). A circular seed locks nodes into a donut;
	//    a random seed lets FA2 form natural community blobs.
	console.log("→ Seeding with random layout…");
	random.assign(graph, { scale: 1000, rng: seededRandom(42) });

	// 2. Pre-assign sizes so FA2 (adjustSizes) and noverlap respect them.
	graph.forEachNode((node, attrs) => {
		const degree = Number(attrs.degree_static ?? graph.degree(node));
		const dimension = (attrs.dimension as Dimension) ?? "imagen";
		graph.setNodeAttribute(node, "size", nodeSize(dimension, degree));
	});

	// 3. ForceAtlas2 — Gephi-like settings for clear community blobs:
	//    - linLogMode + outboundAttractionDistribution: spread communities and
	//      stop hubs from absorbing their neighbours.
	//    - gravity 1, scalingRatio 2: standard Gephi defaults with linLog —
	//      strong enough to form cohesive blobs without central pile-up.
	//    - Two passes: a long shape-finding pass first, then a shorter refine
	//      pass with adjustSizes for honest visual radii.
	const fa2Base = {
		linLogMode: true,
		outboundAttractionDistribution: true,
		gravity: 1,
		scalingRatio: 2,
		strongGravityMode: false,
		barnesHutOptimize: true,
		barnesHutTheta: 0.8,
		edgeWeightInfluence: 1,
		slowDown: 1,
	} as const;
	console.log("→ Running ForceAtlas2 (shape pass, 1500 it.)…");
	forceAtlas2.assign(graph, {
		iterations: 1500,
		settings: { ...fa2Base, adjustSizes: false },
	});
	console.log("→ Running ForceAtlas2 (refine pass, 500 it. + adjustSizes)…");
	forceAtlas2.assign(graph, {
		iterations: 500,
		settings: { ...fa2Base, adjustSizes: true },
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
		// Some collections use variant suffixes (e.g. `_ma` for Gudiol scans);
		// we probe a list of candidates so the mapping is suffix-agnostic.
		const local = new Set(readdirSync(IMAGES_DIR));
		let matched = 0;
		graph.forEachNode((id, attrs) => {
			if ((attrs.dimension as Dimension) !== "imagen") return;
			const base = id.replace(/\.[^.]+$/, "");
			// Probe order: exact match first, then known suffix variants.
			const candidates = [
				`${base}.webp`,
				`${base}_ma.webp`,
			];
			const thumbName = candidates.find((c) => local.has(c));
			if (!thumbName) return;
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
