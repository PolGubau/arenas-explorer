"use client";

import { useExplorerState } from "@/hooks/useExplorerState";
import type { Dimension } from "@/types/graph";
import { useSigma } from "@react-sigma/core";
import { useEffect, useRef } from "react";

/**
 * If the URL already carries a `?n=<id>`, leave selection untouched.
 * Otherwise pick the imagen node with the highest degree as a sensible entry
 * point. Runs only once per Sigma mount.
 */
export function InitialSelection() {
  const sigma = useSigma();
  const { nodeId, setSelected } = useExplorerState();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    if (nodeId) {
      done.current = true;
      return;
    }
    const graph = sigma.getGraph();
    if (graph.order === 0) return;

    let bestId: string | null = null;
    let bestDeg = -1;
    graph.forEachNode((node, attrs) => {
      if ((attrs.dimension as Dimension) !== "imagen") return;
      const deg = (attrs.degree as number) ?? graph.degree(node);
      if (deg > bestDeg) {
        bestDeg = deg;
        bestId = node;
      }
    });

    if (bestId) {
      done.current = true;
      setSelected(bestId);
    }
  }, [sigma, nodeId, setSelected]);

  return null;
}
