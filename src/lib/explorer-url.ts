import { ALL_DIMENSIONS } from "@/lib/constants";
import type { Dimension } from "@/types/graph";

/**
 * Single source of truth for the explorer URL schema.
 * - `n`  node id (selected)
 * - `l`  comma-separated active layers (absent ⇒ all)
 * - `y`  "1" if mismo-año edges are visible
 */
export const URL_KEYS = {
	node: "n",
	layers: "l",
	sameYear: "y",
} as const;

const DIMENSION_SET: ReadonlySet<Dimension> = new Set(ALL_DIMENSIONS);

export interface ExplorerUrlState {
	nodeId: string | null;
	activeLayers: ReadonlySet<Dimension>;
	showSameYear: boolean;
}

const ALL_LAYERS_SET: ReadonlySet<Dimension> = new Set(ALL_DIMENSIONS);

export function parseExplorerUrl(
	params: URLSearchParams | ReadonlyURLSearchParamsLike,
): ExplorerUrlState {
	const raw = params.get(URL_KEYS.layers);
	let activeLayers: ReadonlySet<Dimension> = ALL_LAYERS_SET;
	if (raw != null) {
		const list = raw
			.split(",")
			.map((s) => s.trim())
			.filter((s): s is Dimension => DIMENSION_SET.has(s as Dimension));
		activeLayers = new Set(list);
	}
	return {
		nodeId: params.get(URL_KEYS.node),
		activeLayers,
		showSameYear: params.get(URL_KEYS.sameYear) === "1",
	};
}

/** Mutates `params` in place to reflect the patch, dropping default values. */
export function applyExplorerPatch(
	params: URLSearchParams,
	patch: Partial<{
		nodeId: string | null;
		activeLayers: ReadonlySet<Dimension>;
		showSameYear: boolean;
	}>,
): URLSearchParams {
	if ("nodeId" in patch) {
		if (patch.nodeId) params.set(URL_KEYS.node, patch.nodeId);
		else params.delete(URL_KEYS.node);
	}
	if ("activeLayers" in patch && patch.activeLayers) {
		const layers = patch.activeLayers;
		const isAll =
			layers.size === ALL_DIMENSIONS.length &&
			ALL_DIMENSIONS.every((d) => layers.has(d));
		if (isAll) {
			params.delete(URL_KEYS.layers);
		} else {
			params.set(
				URL_KEYS.layers,
				ALL_DIMENSIONS.filter((d) => layers.has(d)).join(","),
			);
		}
	}
	if ("showSameYear" in patch) {
		if (patch.showSameYear) params.set(URL_KEYS.sameYear, "1");
		else params.delete(URL_KEYS.sameYear);
	}
	return params;
}

/** Minimal shape compatible with Next's ReadonlyURLSearchParams + DOM URLSearchParams. */
interface ReadonlyURLSearchParamsLike {
	get(name: string): string | null;
}
