"use client";

import { ALL_DIMENSIONS } from "@/lib/constants";
import type { Dimension } from "@/types/graph";
import { create } from "zustand";

interface GraphStore {
	selectedNodeId: string | null;
	hoveredNodeId: string | null;
	activeLayers: Set<Dimension>;
	showSameYear: boolean;
	setSelected: (id: string | null) => void;
	setHovered: (id: string | null) => void;
	toggleLayer: (d: Dimension) => void;
	toggleSameYear: () => void;
}

export const useGraphStore = create<GraphStore>()((set) => ({
	selectedNodeId: null,
	hoveredNodeId: null,
	activeLayers: new Set(ALL_DIMENSIONS),
	showSameYear: false,
	setSelected: (id) => set({ selectedNodeId: id }),
	setHovered: (id) => set({ hoveredNodeId: id }),
	toggleLayer: (d) =>
		set((s) => {
			const next = new Set(s.activeLayers);
			if (next.has(d)) next.delete(d);
			else next.add(d);
			return { activeLayers: next };
		}),
	toggleSameYear: () => set((s) => ({ showSameYear: !s.showSameYear })),
}));
