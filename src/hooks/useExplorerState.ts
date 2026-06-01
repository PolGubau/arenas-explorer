"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
	applyExplorerPatch,
	parseExplorerUrl,
	type ExplorerUrlState,
} from "@/lib/explorer-url";
import { ALL_DIMENSIONS } from "@/lib/constants";
import type { Dimension } from "@/types/graph";

interface ExplorerActions {
	setSelected: (id: string | null) => void;
	toggleLayer: (d: Dimension) => void;
	setLayers: (layers: ReadonlySet<Dimension>) => void;
	toggleSameYear: () => void;
}

/**
 * URL is the single source of truth for selection, layer filters and
 * mismo-año toggle. Selection updates use `router.replace` with
 * `scroll: false` so back/forward still works while staying client-side.
 */
export function useExplorerState(): ExplorerUrlState & ExplorerActions {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const state = useMemo(() => parseExplorerUrl(searchParams), [searchParams]);

	const push = useCallback(
		(patch: Partial<ExplorerUrlState>) => {
			const params = new URLSearchParams(searchParams.toString());
			applyExplorerPatch(params, patch);
			const qs = params.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[router, pathname, searchParams],
	);

	const setSelected = useCallback(
		(id: string | null) => push({ nodeId: id }),
		[push],
	);

	const toggleLayer = useCallback(
		(d: Dimension) => {
			const next = new Set(state.activeLayers);
			if (next.has(d)) next.delete(d);
			else next.add(d);
			if (next.size === 0) {
				next.clear();
				ALL_DIMENSIONS.forEach((x) => next.add(x));
			}
			push({ activeLayers: next });
		},
		[push, state.activeLayers],
	);

	const setLayers = useCallback(
		(layers: ReadonlySet<Dimension>) => push({ activeLayers: layers }),
		[push],
	);

	const toggleSameYear = useCallback(
		() => push({ showSameYear: !state.showSameYear }),
		[push, state.showSameYear],
	);

	return {
		...state,
		setSelected,
		toggleLayer,
		setLayers,
		toggleSameYear,
	};
}
