"use client";

import { useMemo } from "react";
import type Graph from "graphology";
import type { Relation } from "@/types/graph";

export interface NeighborsByRelation {
  lleva_puesto: string[];
  pertenece_a_año: string[];
  contiene_palabra: string[];
  mismo_año: string[];
}

/**
 * Returns the neighbours of `nodeId`, grouped by edge relation.
 * Uses Graphology's edge iteration so it's safe for both directions.
 */
export function useNodeNeighbors(
  graph: Graph | null,
  nodeId: string | null,
): NeighborsByRelation {
  return useMemo(() => {
    const empty: NeighborsByRelation = {
      lleva_puesto: [],
      pertenece_a_año: [],
      contiene_palabra: [],
      mismo_año: [],
    };
    if (!graph || !nodeId || !graph.hasNode(nodeId)) return empty;

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
