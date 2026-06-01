import { ALL_DIMENSIONS, DEFAULT_HIDDEN_RELATIONS } from "@/lib/constants";
import type { Dimension, Relation } from "@/types/graph";

/**
 * Single source of truth for the explorer URL schema.
 * - `n`  node id (selected)
 * - `l`  comma-separated active layers (absent ⇒ all)
 * - `h`  comma-separated hidden relations (absent ⇒ default; empty ⇒ none hidden)
 * - `c`  "1" when coloring by community instead of by dimension
 */
export const URL_KEYS = {
	node: "n",
	layers: "l",
	hidden: "h",
	community: "c",
} as const;

const DIMENSION_SET: ReadonlySet<Dimension> = new Set(ALL_DIMENSIONS);
const RELATION_SET: ReadonlySet<Relation> = new Set<Relation>([
	"lleva_puesto",
	"mismo_año",
	"pertenece_a_año",
	"contiene_palabra",
]);

export interface ExplorerUrlState {
	nodeId: string | null;
	activeLayers: ReadonlySet<Dimension>;
	hiddenRelations: ReadonlySet<Relation>;
	colorByCommunity: boolean;
}

const ALL_LAYERS_SET: ReadonlySet<Dimension> = new Set(ALL_DIMENSIONS);

export function parseExplorerUrl(
	params: URLSearchParams | ReadonlyURLSearchParamsLike,
): ExplorerUrlState {
	const rawLayers = params.get(URL_KEYS.layers);
	let activeLayers: ReadonlySet<Dimension> = ALL_LAYERS_SET;
	if (rawLayers != null) {
		const list = rawLayers
			.split(",")
			.map((s) => s.trim())
			.filter((s): s is Dimension => DIMENSION_SET.has(s as Dimension));
		activeLayers = new Set(list);
	}

	const rawHidden = params.get(URL_KEYS.hidden);
	let hiddenRelations: ReadonlySet<Relation> = DEFAULT_HIDDEN_RELATIONS;
	if (rawHidden != null) {
		// Empty string ⇒ user explicitly hides nothing.
		const list = rawHidden
			.split(",")
			.map((s) => s.trim())
			.filter((s): s is Relation => RELATION_SET.has(s as Relation));
		hiddenRelations = new Set(list);
	}

	return {
		nodeId: params.get(URL_KEYS.node),
		activeLayers,
		hiddenRelations,
		colorByCommunity: params.get(URL_KEYS.community) === "1",
	};
}

/** Mutates `params` in place to reflect the patch, dropping default values. */
export function applyExplorerPatch(
	params: URLSearchParams,
	patch: Partial<{
		nodeId: string | null;
		activeLayers: ReadonlySet<Dimension>;
		hiddenRelations: ReadonlySet<Relation>;
		colorByCommunity: boolean;
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
	if ("colorByCommunity" in patch) {
		if (patch.colorByCommunity) params.set(URL_KEYS.community, "1");
		else params.delete(URL_KEYS.community);
	}
	if ("hiddenRelations" in patch && patch.hiddenRelations) {
		const hidden = patch.hiddenRelations;
		const isDefault =
			hidden.size === DEFAULT_HIDDEN_RELATIONS.size &&
			[...DEFAULT_HIDDEN_RELATIONS].every((r) => hidden.has(r));
		if (isDefault) {
			params.delete(URL_KEYS.hidden);
		} else {
			// Empty value is meaningful: "explicitly hide nothing".
			params.set(URL_KEYS.hidden, [...hidden].join(","));
		}
	}
	return params;
}

/** Minimal shape compatible with Next's ReadonlyURLSearchParams + DOM URLSearchParams. */
interface ReadonlyURLSearchParamsLike {
	get(name: string): string | null;
}
