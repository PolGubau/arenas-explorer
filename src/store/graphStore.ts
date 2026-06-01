"use client";

import { create } from "zustand";

/**
 * Ephemeral UI state only — selection / layers / sameYear live in the URL
 * (see `useExplorerState`). Hover is intentionally kept out of React's
 * render path; consumers read it directly via Sigma refs.
 */
interface GraphStore {
	hoveredNodeId: string | null;
	setHovered: (id: string | null) => void;
}

export const useGraphStore = create<GraphStore>()((set) => ({
	hoveredNodeId: null,
	setHovered: (id) => set({ hoveredNodeId: id }),
}));
