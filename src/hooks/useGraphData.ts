"use client";

import { DIMENSION_COLORS, nodeSize } from "@/lib/constants";
import type { CommunitySummary, GraphData, ImagesIndex } from "@/types/graph";
import Graph from "graphology";
import { useEffect, useState } from "react";

interface UseGraphDataResult {
	graph: Graph | null;
	imagesIndex: ImagesIndex;
	communities: CommunitySummary[];
	loading: boolean;
	error: Error | null;
}

/**
 * Fetches the pre-built graph.json + images-index.json, hydrates a
 * Graphology instance with all visual attributes (color/size/x/y/type), and
 * returns it ready for Sigma.
 */
export function useGraphData(): UseGraphDataResult {
	const [graph, setGraph] = useState<Graph | null>(null);
	const [imagesIndex, setImagesIndex] = useState<ImagesIndex>({});
	const [communities, setCommunities] = useState<CommunitySummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		let cancelled = false;

		(async () => {
			try {
				const [graphRes, indexRes] = await Promise.all([
					fetch("/data/graph.json"),
					fetch("/data/images-index.json"),
				]);
				if (!graphRes.ok) throw new Error(`graph.json: ${graphRes.status}`);
				if (!indexRes.ok)
					throw new Error(`images-index.json: ${indexRes.status}`);

				const data = (await graphRes.json()) as GraphData;
				const index = (await indexRes.json()) as ImagesIndex;
				if (cancelled) return;

				const g = new Graph({ multi: false, type: "undirected" });

				// Pre-build the SerializedGraph payload and hand it to Graphology
				// in one shot. `graph.import` is materially faster than per-node
				// `addNode` because it skips per-call event dispatch and the
				// internal "is duplicate?" guard runs against a single fresh
				// graph instead of one that's already been mutated N times.
				const nodeIds = new Set<string>();
				const nodesPayload = data.nodes.map((n) => {
					nodeIds.add(n.id);
					const imageMeta = index[n.id];
					const hasImage = n.dimension === "imagen" && !!imageMeta?.url;
					return {
						key: n.id,
						attributes: {
							label: n.label,
							dimension: n.dimension,
							community: n.community,
							degree: n.degree,
							x: n.x,
							y: n.y,
							year: n.year,
							confianza: n.confianza,
							n_fotos: n.n_fotos,
							color: DIMENSION_COLORS[n.dimension],
							size: nodeSize(n.dimension, n.degree),
							type: hasImage ? "image" : "circle",
							...(hasImage && imageMeta ? { image: imageMeta.url } : {}),
						},
					};
				});

				// Dedupe edges by unordered endpoint pair — required because
				// `multi: false` makes `graph.import` throw on duplicates, and
				// the source data legitimately can contain repeated pairs.
				const seenPairs = new Set<string>();
				const edgesPayload: {
					source: string;
					target: string;
					attributes: { relation: string };
				}[] = [];
				for (const e of data.edges) {
					if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
					const key =
						e.source < e.target
							? `${e.source}\u0000${e.target}`
							: `${e.target}\u0000${e.source}`;
					if (seenPairs.has(key)) continue;
					seenPairs.add(key);
					edgesPayload.push({
						source: e.source,
						target: e.target,
						attributes: { relation: e.relation },
					});
				}

				g.import({ nodes: nodesPayload, edges: edgesPayload });

				// Show graph immediately — NodeImageProgram handles its own lazy loading.
				if (cancelled) return;
				setGraph(g);
				setImagesIndex(index);
				setCommunities(data.communities ?? []);
				setLoading(false);
			} catch (e) {
				if (cancelled) return;
				setError(e as Error);
				setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	return { graph, imagesIndex, communities, loading, error };
}
