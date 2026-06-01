"use client";

import { useEffect } from "react";
import { useSigma, useSetSettings } from "@react-sigma/core";
import { useGraphStore } from "@/store/graphStore";
import { RELATION_COLORS } from "@/lib/constants";
import type { Dimension, Relation } from "@/types/graph";

const DIM_OUT_COLOR = "#26262c";
const EDGE_DIM_COLOR = "#1c1c22";

/**
 * Sets nodeReducer + edgeReducer dynamically from Zustand state.
 * - dimension toggles → hide nodes (never drop, would break FA2 layout)
 * - mismo_año edges → hidden unless explicitly toggled on
 * - hover → ego-graph highlight (neighbours stay vivid, rest dims)
 * - selected → border ring + topmost zIndex
 */
export function GraphReducers() {
  const sigma = useSigma();
  const setSettings = useSetSettings();

  const activeLayers = useGraphStore((s) => s.activeLayers);
  const showSameYear = useGraphStore((s) => s.showSameYear);
  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);

  useEffect(() => {
    const graph = sigma.getGraph();

    setSettings({
      nodeReducer: (node, data) => {
        const dim = (data.dimension ?? "imagen") as Dimension;
        const out = { ...data };

        if (!activeLayers.has(dim)) {
          out.hidden = true;
          return out;
        }

        let isFocus = false;
        if (hoveredNodeId && graph.hasNode(hoveredNodeId)) {
          const isNeighbour =
            node === hoveredNodeId || graph.areNeighbors(hoveredNodeId, node);
          if (!isNeighbour) {
            out.color = DIM_OUT_COLOR;
            out.label = "";
            out.zIndex = 0;
          } else {
            isFocus = true;
            out.zIndex = 2;
          }
        }

        if (selectedNodeId === node) {
          out.color = data.color;
          out.size = (data.size ?? 8) * 1.4;
          out.zIndex = 3;
          out.highlighted = true;
          out.forceLabel = true;
        } else if (isFocus) {
          out.forceLabel = true;
        }

        return out;
      },

      edgeReducer: (edge, data) => {
        const rel = data.relation as Relation | undefined;
        const out = { ...data };

        if (rel === "mismo_año" && !showSameYear) {
          out.hidden = true;
          return out;
        }

        const [s, t] = graph.extremities(edge);
        const sDim = graph.getNodeAttribute(s, "dimension") as Dimension;
        const tDim = graph.getNodeAttribute(t, "dimension") as Dimension;
        if (!activeLayers.has(sDim) || !activeLayers.has(tDim)) {
          out.hidden = true;
          return out;
        }

        if (hoveredNodeId) {
          const touches = s === hoveredNodeId || t === hoveredNodeId;
          out.color = touches
            ? rel
              ? RELATION_COLORS[rel]
              : "#3a3a44"
            : EDGE_DIM_COLOR;
          out.size = touches ? 1.4 : 0.4;
          out.zIndex = touches ? 1 : 0;
        } else {
          out.color = rel ? RELATION_COLORS[rel] : "#3a3a44";
          out.size = 0.8;
        }

        return out;
      },
    });
  }, [sigma, setSettings, activeLayers, showSameYear, hoveredNodeId, selectedNodeId]);

  return null;
}
