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

// ─── Constants ───────────────────────────────────────────────────────────────
// Allow-lists used to validate GEXF attribute values. A mis-typed dimension or
// relation is a data bug — better to fail the build than silently mis-render.
const DIMENSIONS: ReadonlySet<Dimension> = new Set([
	"imagen",
	"transcripcion",
	"año",
	"vestimenta",
]);
const RELATIONS: ReadonlySet<Relation> = new Set([
	"lleva_puesto",
	"mismo_año",
	"pertenece_a_año",
	"contiene_palabra",
]);

// Random seed (mulberry32) — fixed so node positions are reproducible across
// builds. ForceAtlas2 itself adds non-determinism inside Barnes-Hut, so the
// final layout is *approximately* deterministic, not bit-for-bit.
const RANDOM_SEED = 42;
const RANDOM_LAYOUT_SCALE = 1000;

// ForceAtlas2 — tuned for clear community blobs:
//   - linLogMode + outboundAttractionDistribution: spread communities apart
//     and stop hubs from absorbing their neighbours.
//   - gravity 0.08: very low pull toward center lets communities drift apart.
//   - scalingRatio 8: stronger repulsion between unconnected nodes.
//   - FA2 runs on a layout-only clone with `mismo_año` edges removed so that
//     the 1 596 same-year photo↔photo edges don't collapse all años into one blob.
//   - Two passes: a long shape-finding pass first, then a shorter refine
//     pass with adjustSizes so radii match what Sigma will actually render.
const FA2_SHAPE_ITERATIONS = 2000;
const FA2_REFINE_ITERATIONS = 500;
const FA2_BASE_SETTINGS = {
	linLogMode: true,
	outboundAttractionDistribution: true,
	gravity: 0.08,
	scalingRatio: 8,
	strongGravityMode: false,
	barnesHutOptimize: true,
	barnesHutTheta: 0.8,
	edgeWeightInfluence: 1,
	slowDown: 1,
} as const;

// Community expansion factor — after FA2, each community centroid is pushed
// radially away from the global centroid by this multiplier.  0 = off, 1 = full
// distance duplication.  0.5 gives visible separation without destroying shape.
const COMMUNITY_EXPANSION_K = 0.5;

// Anti-collision pass: ratio is derived from the layout's actual coordinate
// span so node sizes map cleanly into graph units regardless of FA2 scale.
const NOVERLAP_ITERATIONS = 200;
const NOVERLAP_RATIO_DIVISOR = 30;
const NOVERLAP_MARGIN_FACTOR = 2;
const NOVERLAP_EXPANSION = 1.2;
const NOVERLAP_GRID_SIZE = 50;
const NOVERLAP_SPEED = 4;

// Thumb filename probing: GEXF node ids are the original `.jpg` filenames;
// thumbs are `.webp`. Some collections add variant suffixes (e.g. `_ma` on
// Gudiol-restored scans) — we probe a small ordered list of candidates.
const THUMB_EXTENSION = "webp";
const THUMB_SUFFIX_VARIANTS = ["", "_ma"] as const;

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

function assertDimension(value: unknown, nodeId: string): Dimension {
	if (typeof value === "string" && DIMENSIONS.has(value as Dimension)) {
		return value as Dimension;
	}
	throw new Error(
		`Node "${nodeId}" has invalid dimension: ${JSON.stringify(value)}. ` +
			`Expected one of: ${[...DIMENSIONS].join(", ")}`,
	);
}

function assertRelation(value: unknown, edgeRef: string): Relation {
	if (typeof value === "string" && RELATIONS.has(value as Relation)) {
		return value as Relation;
	}
	throw new Error(
		`Edge ${edgeRef} has invalid relation: ${JSON.stringify(value)}. ` +
			`Expected one of: ${[...RELATIONS].join(", ")}`,
	);
}

const ROOT = process.cwd();
const GEXF_PATH = join(ROOT, "data", "grafo.gexf");
const CSV_PATH = join(ROOT, "data", "input.csv");
const IMAGES_DIR = join(ROOT, "public", "images-thumb");
const IMAGES_PUBLIC_PREFIX = "/images-thumb";
const OUT_DIR = join(ROOT, "public", "data");

// Strips a UTF-8 BOM (U+FEFF) prefix — Excel and other editors add one on
// export and it silently corrupts the first header name.
function stripBom(text: string): string {
	return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseCsv(text: string): Record<string, string>[] {
	const clean = stripBom(text);
	const lines = clean.split(/\r?\n/).filter(Boolean);
	const header = lines[0];
	if (!header) return [];
	const headers = splitCsvLine(header);
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
	random.assign(graph, {
		scale: RANDOM_LAYOUT_SCALE,
		rng: seededRandom(RANDOM_SEED),
	});

	// 2. Pre-assign sizes so FA2 (adjustSizes) and noverlap respect them.
	//    `degree_static` (from the GEXF) is preferred over the runtime degree
	//    because it represents the *original* multidimensional degree from
	//    Gephi, before any filtering — the value the visual hierarchy was
	//    designed against.
	graph.forEachNode((node, attrs) => {
		const degree = Number(attrs.degree_static ?? graph.degree(node));
		const dimension = assertDimension(attrs.dimension, node);
		graph.setNodeAttribute(node, "size", nodeSize(dimension, degree));
	});

	// Build a layout-only clone that omits `mismo_año` edges.
	// Those 1 596 photo↔photo edges act as strong attractors and collapse all
	// years into a single central mass.  We keep them in the full graph (for
	// the JSON output) but exclude them from the FA2 force computation.
	console.log("→ Building layout clone (without mismo_año edges)…");
	const layoutGraph = graph.copy();
	const toRemove: string[] = [];
	layoutGraph.forEachEdge((id, attrs) => {
		if (attrs.relation === "mismo_año") toRemove.push(id);
	});
	for (const id of toRemove) layoutGraph.dropEdge(id);
	console.log(`  Removed ${toRemove.length} mismo_año edges from layout clone`);

	console.log(
		`→ Running ForceAtlas2 (shape pass, ${FA2_SHAPE_ITERATIONS} it.)…`,
	);
	forceAtlas2.assign(layoutGraph, {
		iterations: FA2_SHAPE_ITERATIONS,
		settings: { ...FA2_BASE_SETTINGS, adjustSizes: false },
	});
	console.log(
		`→ Running ForceAtlas2 (refine pass, ${FA2_REFINE_ITERATIONS} it. + adjustSizes)…`,
	);
	forceAtlas2.assign(layoutGraph, {
		iterations: FA2_REFINE_ITERATIONS,
		settings: { ...FA2_BASE_SETTINGS, adjustSizes: true },
	});

	// Copy FA2 positions back onto the full graph.
	layoutGraph.forEachNode((id, attrs) => {
		graph.setNodeAttribute(id, "x", attrs.x);
		graph.setNodeAttribute(id, "y", attrs.y);
	});

	// 3. Community expansion: push each community centroid radially away from
	//    the global centroid.  This separates blobs without touching local shape.
	console.log("→ Applying community expansion…");
	const communityNodes = new Map<number, string[]>();
	graph.forEachNode((id, attrs) => {
		const c = Number(attrs.community ?? 0);
		const bucket = communityNodes.get(c) ?? [];
		bucket.push(id);
		communityNodes.set(c, bucket);
	});

	// Global centroid.
	let gx = 0;
	let gy = 0;
	graph.forEachNode((_id, attrs) => {
		gx += Number(attrs.x);
		gy += Number(attrs.y);
	});
	gx /= graph.order;
	gy /= graph.order;

	for (const [, ids] of communityNodes) {
		// Community centroid.
		let cx = 0;
		let cy = 0;
		for (const id of ids) {
			cx += Number(graph.getNodeAttribute(id, "x"));
			cy += Number(graph.getNodeAttribute(id, "y"));
		}
		cx /= ids.length;
		cy /= ids.length;

		const dx = cx - gx;
		const dy = cy - gy;

		// Shift every node in this community by K * (centroid − global).
		for (const id of ids) {
			graph.setNodeAttribute(
				id,
				"x",
				Number(graph.getNodeAttribute(id, "x")) + dx * COMMUNITY_EXPANSION_K,
			);
			graph.setNodeAttribute(
				id,
				"y",
				Number(graph.getNodeAttribute(id, "y")) + dy * COMMUNITY_EXPANSION_K,
			);
		}
	}
	console.log(
		`  Expanded ${communityNodes.size} communities (k=${COMMUNITY_EXPANSION_K})`,
	);

	// 3. Anti-collision pass — eliminates residual node overlap without
	//    destroying the FA2 cluster structure.
	let minX = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
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
	const noverlapRatio = meanSpacing / NOVERLAP_RATIO_DIVISOR;
	console.log("→ Running noverlap (anti-collision)…");
	noverlap.assign(graph, {
		maxIterations: NOVERLAP_ITERATIONS,
		settings: {
			ratio: noverlapRatio,
			margin: noverlapRatio * NOVERLAP_MARGIN_FACTOR,
			expansion: NOVERLAP_EXPANSION,
			gridSize: NOVERLAP_GRID_SIZE,
			speed: NOVERLAP_SPEED,
		},
	});

	// Project nodes
	const nodes: GraphNode[] = [];
	graph.forEachNode((id, attrs) => {
		nodes.push({
			id,
			label: String(attrs.label ?? attrs.title ?? id),
			dimension: assertDimension(attrs.dimension, id),
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
	graph.forEachEdge((id, attrs, source, target) => {
		edges.push({
			source,
			target,
			relation: assertRelation(attrs.relation, `${source}→${target} (${id})`),
		});
	});

	const graphData: GraphData = { nodes, edges };

	// Build images-index — prefer CSV when available, otherwise fall back to
	// whatever images live in public/images-thumb (matched by node id).
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
		// Node ids are the original `.jpg` filenames; thumbs are `.webp`.
		// Probe a small ordered list of suffix variants so the mapping is
		// suffix-agnostic across collections.
		const local = new Set(readdirSync(IMAGES_DIR));
		let matched = 0;
		graph.forEachNode((id, attrs) => {
			if (assertDimension(attrs.dimension, id) !== "imagen") return;
			const base = id.replace(/\.[^.]+$/, "");
			const candidates = THUMB_SUFFIX_VARIANTS.map(
				(suffix) => `${base}${suffix}.${THUMB_EXTENSION}`,
			);
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

try {
	main();
} catch (err) {
	console.error("\n✗ parse-gexf failed:");
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
}
