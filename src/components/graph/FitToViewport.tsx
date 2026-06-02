"use client";

import { useSigma } from "@react-sigma/core";
import { useEffect } from "react";

/**
 * Returns the ideal camera ratio for the given canvas pixel width.
 * Higher ratio = more zoomed-out → nodes appear smaller and less crowded.
 *
 *  < 900 px  → 1.6  (small laptop / portrait tablet)
 *  < 1280 px → 1.25 (medium laptop)
 *  ≥ 1280 px → 1.0  (large desktop monitor)
 *
 * Exported so GraphControls can reuse it for "Centrar vista".
 */
export function computeAdaptiveRatio(canvasWidth: number): number {
  if (canvasWidth < 900) return 1.6;
  if (canvasWidth < 1280) return 1.25;
  return 1.0;
}

/**
 * Sets the initial camera ratio once on mount so the graph doesn't appear
 * too large and crowded on small laptop screens.
 *
 * Must be rendered inside a <SigmaContainer>.
 */
export function FitToViewport() {
  const sigma = useSigma();

  useEffect(() => {
    const { width } = sigma.getDimensions();
    const ratio = computeAdaptiveRatio(width);
    sigma.getCamera().setState({ x: 0.5, y: 0.5, ratio, angle: 0 });
  // sigma is stable across renders — this effect runs exactly once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
