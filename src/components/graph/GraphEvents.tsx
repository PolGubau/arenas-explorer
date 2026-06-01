"use client";

import { useExplorerState } from "@/hooks/useExplorerState";
import { useGraphStore } from "@/store/graphStore";
import { useRegisterEvents, useSigma } from "@react-sigma/core";
import { useEffect, useRef } from "react";

/**
 * Click → updates URL (`?n=…`). Hover updates the ephemeral Zustand store
 * via a RAF-throttled write to avoid more than one render per frame.
 */
export function GraphEvents() {
  const sigma = useSigma();
  const register = useRegisterEvents();
  const { setSelected } = useExplorerState();
  const setHovered = useGraphStore((s) => s.setHovered);
  const rafRef = useRef<number | null>(null);
  const pendingHoverRef = useRef<string | null>(null);

  useEffect(() => {
    const flushHover = () => {
      rafRef.current = null;
      setHovered(pendingHoverRef.current);
    };
    const scheduleHover = (id: string | null) => {
      pendingHoverRef.current = id;
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flushHover);
      }
    };

    register({
      clickNode: ({ node }) => setSelected(node),
      enterNode: ({ node }) => {
        scheduleHover(node);
        const container = sigma.getContainer();
        if (container) container.style.cursor = "pointer";
      },
      leaveNode: () => {
        scheduleHover(null);
        const container = sigma.getContainer();
        if (container) container.style.cursor = "default";
      },
      clickStage: () => {
        // keep current selection — clicking the empty canvas does not deselect
      },
    });

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [register, sigma, setSelected, setHovered]);

  return null;
}
