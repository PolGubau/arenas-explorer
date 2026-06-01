"use client";

import { ALL_DIMENSIONS } from "@/lib/constants";
import {
	type ExplorerUrlState,
	applyExplorerPatch,
	parseExplorerUrl,
} from "@/lib/explorer-url";
import type { Dimension, Relation } from "@/types/graph";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

interface ExplorerActions {
	setSelected: (id: string | null) => void;
	toggleLayer: (d: Dimension) => void;
	setLayers: (layers: ReadonlySet<Dimension>) => void;
	toggleRelation: (rel: Relation) => void;
	toggleColorByCommunity: () => void;
}

/**
 * URL is the single source of truth for selection, layer filters and
 * hidden-relations set. Selection updates use `router.replace` with
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

	const toggleRelation = useCallback(
		(rel: Relation) => {
			const next = new Set(state.hiddenRelations);
			if (next.has(rel)) next.delete(rel);
			else next.add(rel);
			push({ hiddenRelations: next });
		},
		[push, state.hiddenRelations],
	);

	const toggleColorByCommunity = useCallback(
		() => push({ colorByCommunity: !state.colorByCommunity }),
		[push, state.colorByCommunity],
	);

	return {
		...state,
		setSelected,
		toggleLayer,
		setLayers,
		toggleRelation,
		toggleColorByCommunity,
	};
}
