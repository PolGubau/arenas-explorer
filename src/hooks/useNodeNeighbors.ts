"use client";

import type { Relation } from "@/types/graph";
import type Graph from "graphology";
import { useMemo } from "react";

export interface NeighborsByRelation {
	lleva_puesto: string[];
	pertenece_a_año: string[];
	contiene_palabra: string[];
	mismo_año: string[];
}

// Module-level fallback: returned by reference whenever there's nothing to
// compute, so consumers' memo dependencies stay stable across renders. The
// inner arrays are read-only by convention — never mutated by callers.
const EMPTY_NEIGHBORS: NeighborsByRelation = {
	lleva_puesto: [],
	pertenece_a_año: [],
	contiene_palabra: [],
	mismo_año: [],
};

/**
 * Returns the neighbours of `nodeId`, grouped by edge relation.
 * Uses Graphology's edge iteration so it's safe for both directions.
 */
export function useNodeNeighbors(
	graph: Graph | null,
	nodeId: string | null,
): NeighborsByRelation {
	return useMemo(() => {
		if (!graph || !nodeId || !graph.hasNode(nodeId)) return EMPTY_NEIGHBORS;

		const out: NeighborsByRelation = {
			lleva_puesto: [],
			pertenece_a_año: [],
			contiene_palabra: [],
			mismo_año: [],
		};

		graph.forEachEdge(nodeId, (_edge, attrs, source, target) => {
			const other = source === nodeId ? target : source;
			const rel = attrs.relation as Relation | undefined;
			if (!rel) return;
			out[rel].push(other);
		});

		return out;
	}, [graph, nodeId]);
}
