"use client";

import { useGraphContext } from "@/context/GraphDataContext";
import { useExplorerState } from "@/hooks/useExplorerState";
import { COMMUNITY_COLORS } from "@/lib/constants";
import { useSigma } from "@react-sigma/core";
import { useEffect, useLayoutEffect, useState } from "react";

/**
 * Floating chips rendered at each community centroid (in graph coords),
 * projected to viewport pixels on every camera/render update.
 *
 * Always visible (independent of the colorByCommunity toggle) so the
 * topology stays legible; chip colors follow the community palette when the
 * toggle is active, otherwise use a neutral style.
 *
 * Implementation notes
 * ────────────────────
 * • `useLayoutEffect` for the initial tick so it fires synchronously after
 *   the first paint — avoids a frame where all chips sit at (0,0) because
 *   Sigma hasn't normalised coordinates yet.
 * • `graphToViewport` is wrapped in a try/catch: before the graph is fully
 *   loaded the normalisation function may return NaN; we skip those frames
 *   and rely on the `afterRender` listener to re-project once Sigma is ready.
 * • z-30 ensures the overlay sits above Sigma's internal canvas layers.
 */
export function CommunityLabels() {
	const sigma = useSigma();
	const { communities } = useGraphContext();
	const { colorByCommunity } = useExplorerState();
	const [, force] = useState(0);

	// Synchronous initial tick so positions are computed after the first paint.
	useLayoutEffect(() => {
		force((v) => v + 1);
	}, []);

	useEffect(() => {
		const tick = () => force((v) => v + 1);
		const camera = sigma.getCamera();
		camera.on("updated", tick);
		sigma.on("afterRender", tick);
		// Trigger immediately in case afterRender already fired before this
		// effect ran (i.e. graph loaded before CommunityLabels mounted).
		tick();
		return () => {
			camera.off("updated", tick);
			sigma.off("afterRender", tick);
		};
	}, [sigma]);

	if (communities.length === 0) return null;

	return (
		<div className="pointer-events-none absolute inset-0 z-30">
			{communities.map((c) => {
				let x: number;
				let y: number;
				try {
					const pos = sigma.graphToViewport({ x: c.x, y: c.y });
					// Skip this chip if Sigma hasn't normalised coordinates yet.
					if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return null;
					x = pos.x;
					y = pos.y;
				} catch {
					return null;
				}

				const color = COMMUNITY_COLORS[c.id % COMMUNITY_COLORS.length];
				const borderColor = colorByCommunity ? color : "rgba(255,255,255,0.30)";
				const textColor = colorByCommunity ? color : "#d4d4d8";
				return (
					<div
						key={c.id}
						className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-lg"
						style={{
							left: x,
							top: y,
							borderColor,
							color: textColor,
							background: "rgba(15,15,18,0.88)",
						}}
						title={
							c.topWords.length > 0
								? `${c.topWords.join(", ")}${c.year ? ` · ${c.year}` : ""}`
								: undefined
						}
					>
						{c.label}
					</div>
				);
			})}
		</div>
	);
}
