"use client";

import {
  SigmaContainer,
  useLoadGraph,
} from "@react-sigma/core";
import { MiniMap } from "@react-sigma/minimap";
import { createNodeImageProgram } from "@sigma/node-image";
import type Graph from "graphology";
import { useEffect } from "react";
import type { Settings } from "sigma/settings";
import type { NodeDisplayData, PartialButFor } from "sigma/types";
import "@react-sigma/core/lib/style.css";

import { CameraSync } from "./CameraSync";
import { CommunityLabels } from "./CommunityLabels";
import { GraphControls } from "./GraphControls";
import { GraphEvents } from "./GraphEvents";
import { GraphReducers } from "./GraphReducers";
import { InitialSelection } from "./InitialSelection";
import { NodeTooltip } from "./NodeTooltip";

interface GraphCanvasProps {
  graph: Graph;
}

/**
 * Custom hover renderer that uses a dark background to match the app's dark
 * theme. Sigma's built-in version hardcodes #FFF, making white label text
 * invisible against it.
 */
function drawDarkNodeHover(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, "x" | "y" | "size" | "label" | "color">,
  settings: Settings,
): void {
  const { labelSize: size, labelFont: font, labelWeight: weight } = settings;
  context.font = `${weight} ${size}px ${font}`;

  context.fillStyle = "#1a1a1f";
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.shadowBlur = 8;
  context.shadowColor = "rgba(0,0,0,0.9)";

  const PADDING = 2;

  if (typeof data.label === "string") {
    const textWidth = context.measureText(data.label).width;
    const boxWidth = Math.round(textWidth + 5);
    const boxHeight = Math.round(size + 2 * PADDING);
    const radius = Math.max(data.size, size / 2) + PADDING;
    const angleRadian = Math.asin(boxHeight / 2 / radius);
    const xDeltaCoord = Math.sqrt(Math.abs(radius ** 2 - (boxHeight / 2) ** 2));

    context.beginPath();
    context.moveTo(data.x + xDeltaCoord, data.y + boxHeight / 2);
    context.lineTo(data.x + radius + boxWidth, data.y + boxHeight / 2);
    context.lineTo(data.x + radius + boxWidth, data.y - boxHeight / 2);
    context.lineTo(data.x + xDeltaCoord, data.y - boxHeight / 2);
    context.arc(data.x, data.y, radius, angleRadian, -angleRadian);
    context.closePath();
    context.fill();
  } else {
    context.beginPath();
    context.arc(data.x, data.y, data.size + PADDING, 0, Math.PI * 2);
    context.closePath();
    context.fill();
  }

  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.shadowBlur = 0;

  if (typeof data.label === "string") {
    const lc = settings.labelColor as
      | { attribute: string; color?: string }
      | { color: string };
    let color: string;
    if ("attribute" in lc) {
      color =
        ((data as Record<string, unknown>)[lc.attribute as string] as
          | string
          | undefined) ??
        lc.color ??
        "#e4e4e7";
    } else {
      color = lc.color;
    }
    context.fillStyle = color;
    context.fillText(data.label, data.x + data.size + 3, data.y + size / 3);
  }
}

const SIGMA_SETTINGS: Partial<Settings> = {
  allowInvalidContainer: true,
  defaultNodeType: "circle",
  defaultEdgeType: "line",
  nodeProgramClasses: {
    // keepWithinCircle clips the image to the circular node boundary so the
    // photo matches the node's circular silhouette. `padding` is intentionally
    // 0: in @sigma/node-image, padding > 0 crops the IMAGE to a square
    // inscribed in the circle (filling the corners with the node color) — i.e.
    // the photo would look square. Community/dimension context for image
    // nodes is conveyed via the floating CommunityLabels chips instead.
    image: createNodeImageProgram({
      padding: 0,
      keepWithinCircle: true,
      drawingMode: "background",
    }),
  },
  defaultDrawNodeHover: drawDarkNodeHover,
  labelColor: { color: "#e4e4e7" },
  labelSize: 12,
  labelWeight: "600",
  labelFont:
    'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  // Labels gate by *rendered* node size: when the user zooms out, low-degree
  // nodes drop below the threshold and only hubs keep their labels. Since
  // `size` is derived from `degree` (see nodeSize), this single threshold
  // gives us importance- and zoom-aware label filtering for free.
  labelDensity: 0.5,
  // Coarser grid → fewer cells to evaluate when placing labels every frame.
  // 150 is large enough to noticeably cut CPU on wide screens without leaving
  // visible holes where hubs would otherwise compete for the same cell.
  labelGridCellSize: 150,
  labelRenderedSizeThreshold: 18,
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
      <CommunityLabels />
      <div className="absolute bottom-16 left-3 z-20 hidden overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-md sm:bottom-20 sm:left-4 sm:block">
        <MiniMap width="140px" height="140px" />
      </div>
    </SigmaContainer>
  );
}
