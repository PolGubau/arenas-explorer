"use client";

import { DIMENSION_COLORS, nodeSize } from "@/lib/constants";
import type { GraphData, ImagesIndex } from "@/types/graph";
import Graph from "graphology";
import { useEffect, useState } from "react";

interface UseGraphDataResult {
	graph: Graph | null;
	imagesIndex: ImagesIndex;
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

				for (const n of data.nodes) {
					const hasImage = n.dimension === "imagen" && !!index[n.id]?.url;
					g.addNode(n.id, {
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
						...(hasImage ? { image: index[n.id].url } : {}),
					});
				}
				for (const e of data.edges) {
					if (!g.hasNode(e.source) || !g.hasNode(e.target)) continue;
					if (g.hasEdge(e.source, e.target)) continue;
					g.addEdge(e.source, e.target, { relation: e.relation });
				}

				// Show graph immediately — NodeImageProgram handles its own lazy loading.
				if (cancelled) return;
				setGraph(g);
				setImagesIndex(index);
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

	return { graph, imagesIndex, loading, error };
}
