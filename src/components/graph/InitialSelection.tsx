"use client";

import { useEffect, useRef } from "react";
import { useSigma } from "@react-sigma/core";
import { useGraphStore } from "@/store/graphStore";
import type { Dimension } from "@/types/graph";

/**
 * On first render, selects the imagen node with the highest degree.
 * Runs only once per Sigma mount.
 */
export function InitialSelection() {
  const sigma = useSigma();
  const setSelected = useGraphStore((s) => s.setSelected);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
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
  }, [sigma, setSelected]);

  return null;
}
