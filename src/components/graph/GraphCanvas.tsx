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
  labelDensity: 0.07,
  labelGridCellSize: 60,
  labelRenderedSizeThreshold: 8,
  edgeLabelSize: 10,
  enableEdgeEvents: false,
  renderEdgeLabels: false,
  hideEdgesOnMove: true,
  hideLabelsOnMove: false,
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
