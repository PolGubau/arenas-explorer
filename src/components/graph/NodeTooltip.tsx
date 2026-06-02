"use client";

import { DIMENSION_COLORS, DIMENSION_LABELS, getClothingLabel } from "@/lib/constants";
import type { Dimension } from "@/types/graph";
import { useRegisterEvents, useSigma } from "@react-sigma/core";
import { useEffect, useRef, useState } from "react";

interface TooltipState {
  x: number;
  y: number;
  label: string;
  dimension: Dimension;
  meta?: string;
}

/**
 * Tooltip position is updated at most once per animation frame: `mousemovebody`
 * fires on every pixel, which would otherwise re-render this component 100+
 * times per second. Latest cursor coords are stashed in a ref and flushed via
 * rAF, mirroring the hover throttle in GraphEvents.
 */
export function NodeTooltip() {
  const sigma = useSigma();
  const register = useRegisterEvents();
  const [tip, setTip] = useState<TooltipState | null>(null);
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const flushPos = () => {
      rafRef.current = null;
      const p = pendingPosRef.current;
      if (!p) return;
      setTip((t) => (t ? { ...t, x: p.x, y: p.y } : t));
    };

    register({
      enterNode: ({ node, event }) => {
        const graph = sigma.getGraph();
        const attrs = graph.getNodeAttributes(node);
        const dimension = (attrs.dimension as Dimension) ?? "imagen";

        let meta: string | undefined;
        if (dimension === "imagen" && attrs.year) {
          meta = `${attrs.year}${attrs.confianza ? ` · ${Math.round(attrs.confianza as number)}%` : ""}`;
        } else if (dimension === "año" && attrs.n_fotos) {
          meta = `${attrs.n_fotos} fotos`;
        } else {
          meta = `${graph.degree(node)} conexiones`;
        }

        const rawLabel = String(attrs.label ?? node);
        setTip({
          x: event.x,
          y: event.y,
          label: dimension === "vestimenta" ? getClothingLabel(rawLabel) : rawLabel,
          dimension,
          meta,
        });
      },
      leaveNode: () => setTip(null),
      mousemovebody: ({ x, y }) => {
        pendingPosRef.current = { x, y };
        if (rafRef.current == null) {
          rafRef.current = requestAnimationFrame(flushPos);
        }
      },
    });

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [register, sigma]);

  if (!tip) return null;

  return (
    <div
      className="pointer-events-none absolute z-20 max-w-[260px] rounded-lg border border-border-strong -elevated/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
      style={{ left: tip.x + 14, top: tip.y + 14 }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: DIMENSION_COLORS[tip.dimension] }}
        />
        <span className="text-[10px] uppercase tracking-wide text-fg-subtle">
          {DIMENSION_LABELS[tip.dimension]}
        </span>
      </div>
      <div className="mt-1 truncate font-medium text-fg">{tip.label}</div>
      {tip.meta && (
        <div className="mt-0.5 text-[10px] text-fg-muted">{tip.meta}</div>
      )}
    </div>
  );
}
