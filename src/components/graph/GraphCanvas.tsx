"use client";

import {
  SigmaContainer,
  useLoadGraph,
} from "@react-sigma/core";
import { NodeImageProgram } from "@sigma/node-image";
import type Graph from "graphology";
import { useEffect } from "react";
import type { Settings } from "sigma/settings";
import "@react-sigma/core/lib/style.css";

import { CameraSync } from "./CameraSync";
import { GraphControls } from "./GraphControls";
import { GraphEvents } from "./GraphEvents";
import { GraphReducers } from "./GraphReducers";
import { InitialSelection } from "./InitialSelection";
import { NodeTooltip } from "./NodeTooltip";

interface GraphCanvasProps {
  graph: Graph;
}

const SIGMA_SETTINGS: Partial<Settings> = {
  allowInvalidContainer: true,
  defaultNodeType: "circle",
  defaultEdgeType: "line",
  nodeProgramClasses: {
    image: NodeImageProgram,
  },
  labelColor: { color: "#a1a1aa" },
  labelSize: 11,
  labelWeight: "500",
  labelFont:
    'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  // Labels gate by *rendered* node size: when the user zooms out, low-degree
  // nodes drop below the threshold and only hubs keep their labels. Since
  // `size` is derived from `degree` (see nodeSize), this single threshold
  // gives us importance- and zoom-aware label filtering for free.
  labelDensity: 0.4,
  labelGridCellSize: 120,
  labelRenderedSizeThreshold: 14,
  edgeLabelSize: 10,
  enableEdgeEvents: false,
  renderEdgeLabels: false,
  hideEdgesOnMove: true,
  hideLabelsOnMove: true,
  minCameraRatio: 0.05,
  maxCameraRatio: 8,
  zIndex: true,
};

function LoadGraph({ graph }: { graph: Graph }) {
  const loadGraph = useLoadGraph();
  useEffect(() => {
    loadGraph(graph);
  }, [loadGraph, graph]);
  return null;
}

export function GraphCanvas({ graph }: GraphCanvasProps) {
  return (
    <SigmaContainer
      style={{ width: "100%", height: "100%", background: "transparent" }}
      settings={SIGMA_SETTINGS}
    >
      <LoadGraph graph={graph} />
      <GraphReducers />
      <GraphEvents />
      <CameraSync />
      <InitialSelection />
      <GraphControls />
      <NodeTooltip />
    </SigmaContainer>
  );
}
