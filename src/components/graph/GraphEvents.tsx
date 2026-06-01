"use client";

import { useEffect } from "react";
import { useRegisterEvents, useSigma } from "@react-sigma/core";
import { useGraphStore } from "@/store/graphStore";

export function GraphEvents() {
  const sigma = useSigma();
  const register = useRegisterEvents();
  const setSelected = useGraphStore((s) => s.setSelected);
  const setHovered = useGraphStore((s) => s.setHovered);

  useEffect(() => {
    register({
      clickNode: ({ node }) => setSelected(node),
      enterNode: ({ node }) => {
        setHovered(node);
        const container = sigma.getContainer();
        if (container) container.style.cursor = "pointer";
      },
      leaveNode: () => {
        setHovered(null);
        const container = sigma.getContainer();
        if (container) container.style.cursor = "default";
      },
      clickStage: () => {
        // keep current selection — clicking the empty canvas does not deselect
      },
    });
  }, [register, sigma, setSelected, setHovered]);

  return null;
}
