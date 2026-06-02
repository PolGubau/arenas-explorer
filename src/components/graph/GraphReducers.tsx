"use client";

import { useExplorerState } from "@/hooks/useExplorerState";
import {
  COMMUNITY_COLORS,
  RELATION_COLORS,
  RELATION_IDLE_COLORS,
} from "@/lib/constants";
import { useGraphStore } from "@/store/graphStore";
import type { Dimension, Relation } from "@/types/graph";
import { useSetSettings, useSigma } from "@react-sigma/core";
import { useEffect, useRef } from "react";

const DIM_OUT_COLOR = "#26262c";
const EDGE_DIM_COLOR = "#1c1c22";

interface ReducerCtx {
  activeLayers: ReadonlySet<Dimension>;
  hiddenRelations: ReadonlySet<Relation>;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  colorByCommunity: boolean;
}

/**
 * Sets the node/edge reducers ONCE at mount. Subsequent state changes only
 * update a ref and call `sigma.refresh({ skipIndexation: true })` —
 * avoiding a fresh `setSettings` and the costly re-allocation it triggers.
 */
export function GraphReducers() {
  const sigma = useSigma();
  const setSettings = useSetSettings();

  const {
    nodeId: selectedNodeId,
    activeLayers,
    hiddenRelations,
    colorByCommunity,
  } = useExplorerState();
  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId);

  const ctxRef = useRef<ReducerCtx>({
    activeLayers,
    hiddenRelations,
    hoveredNodeId,
    selectedNodeId,
    colorByCommunity,
  });

  // Install reducers once. They read from `ctxRef.current` so they always
  // see the latest state without depending on closure capture.
  useEffect(() => {
    const graph = sigma.getGraph();

    setSettings({
      nodeReducer: (node, data) => {
        const {
          activeLayers,
          hoveredNodeId,
          selectedNodeId,
          colorByCommunity,
        } = ctxRef.current;
        const dim = (data.dimension ?? "imagen") as Dimension;
        const out = { ...data };

        if (!activeLayers.has(dim)) {
          out.hidden = true;
          return out;
        }

        // Resolve the base node color: either from community palette or dimension.
        if (colorByCommunity) {
          const communityIdx =
            Number(data.community ?? 0) % COMMUNITY_COLORS.length;
          out.color = COMMUNITY_COLORS[communityIdx];
          // Switch image nodes to plain circles so the community color is
          // clearly visible instead of being covered by the photograph.
          if (data.type === "image") {
            out.type = "circle";
          }
        }

        const nodeColor = out.color as string;

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
          out.color = nodeColor;
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
        const { activeLayers, hiddenRelations, hoveredNodeId } = ctxRef.current;
        const rel = data.relation as Relation | undefined;
        const out = { ...data };

        if (rel && hiddenRelations.has(rel)) {
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
          out.size = touches ? 1.2 : 0.2;
          out.zIndex = touches ? 1 : 0;
        } else {
          out.color = rel ? RELATION_IDLE_COLORS[rel] : "#3a3a4420";
          out.size = rel === "lleva_puesto" ? 0.3 : 0.5;
        }

        return out;
      },
    });
  }, [sigma, setSettings]);

  // Sync ref + trigger a light refresh on every state change.
  useEffect(() => {
    ctxRef.current = {
      activeLayers,
      hiddenRelations,
      hoveredNodeId,
      selectedNodeId,
      colorByCommunity,
    };
    sigma.refresh({ skipIndexation: true });
  }, [
    sigma,
    activeLayers,
    hiddenRelations,
    hoveredNodeId,
    selectedNodeId,
    colorByCommunity,
  ]);

  return null;
}
