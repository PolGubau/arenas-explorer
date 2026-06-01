"use client";

import { useGraphStore } from "@/store/graphStore";
import { useSigma } from "@react-sigma/core";
import { useEffect, useRef } from "react";

/**
 * When `selectedNodeId` changes from outside the canvas (e.g. clicking a chip
 * in the side panel), fly the camera over the node.
 * Skips the animation on initial mount.
 */
export function CameraSync() {
  const sigma = useSigma();
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedNodeId) return;
    if (previous.current === selectedNodeId) return;
    previous.current = selectedNodeId;

    const graph = sigma.getGraph();
    if (!graph.hasNode(selectedNodeId)) return;

    // getNodeDisplayData returns normalised camera-space coords used by
    // sigma.getCamera().animate(...).
    const display = sigma.getNodeDisplayData(selectedNodeId);
    if (!display) return;

    sigma.getCamera().animate(
      { x: display.x, y: display.y, ratio: 0.25 },
      { duration: 600, easing: "quadraticInOut" },
    );
  }, [sigma, selectedNodeId]);

  return null;
}
