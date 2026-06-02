"use client";

import { useGraphContext } from "@/context/GraphDataContext";
import { useExplorerState } from "@/hooks/useExplorerState";
import { COMMUNITY_COLORS } from "@/lib/constants";
import { useSigma } from "@react-sigma/core";
import { useEffect, useRef } from "react";

/**
 * Floating chips at each community centroid, re-projected to viewport pixels
 * whenever the camera moves. Mounted only when `colorByCommunity` is on.
 *
 * Perf notes:
 * - Positions are written **directly to the DOM** via refs, bypassing React
 *   reconciliation. During a continuous pan, the camera emits `updated` at
 *   ~60Hz; routing through `setState` would force 60 renders/sec per chip.
 * - We listen only to `camera.updated`. Sigma's `afterRender` would double-
 *   fire on every camera change and is used here just as a one-shot fallback
 *   for the case where the graph is still being indexed on mount.
 * - `sigma.graphToViewport` can return non-finite values before the graph is
 *   ready; chips without a valid position stay `visibility: hidden`.
 */
export function CommunityLabels() {
	const sigma = useSigma();
	const { communities } = useGraphContext();
	const { colorByCommunity } = useExplorerState();
	const chipRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

	useEffect(() => {
		if (!colorByCommunity || communities.length === 0) return;

		const project = () => {
			for (const c of communities) {
				const el = chipRefs.current.get(c.id);
				if (!el) continue;
				let projected: { x: number; y: number } | null = null;
				try {
					const p = sigma.graphToViewport({ x: c.x, y: c.y });
					if (Number.isFinite(p.x) && Number.isFinite(p.y)) projected = p;
				} catch {
					/* graph not ready yet */
				}
				if (projected) {
					el.style.transform = `translate3d(${projected.x}px, ${projected.y}px, 0) translate(-50%, -50%)`;
					el.style.visibility = "visible";
				} else {
					el.style.visibility = "hidden";
				}
			}
		};

		const camera = sigma.getCamera();
		camera.on("updated", project);
		const onceAfterRender = () => {
			sigma.off("afterRender", onceAfterRender);
			project();
		};
		sigma.on("afterRender", onceAfterRender);
		project();

		return () => {
			camera.off("updated", project);
			sigma.off("afterRender", onceAfterRender);
		};
	}, [sigma, communities, colorByCommunity]);

	if (!colorByCommunity || communities.length === 0) return null;

	return (
		<div className="pointer-events-none absolute inset-0 z-30">
			{communities.map((c) => {
				const color = COMMUNITY_COLORS[c.id % COMMUNITY_COLORS.length];
				return (
					<div
						key={c.id}
						ref={(el) => {
							chipRefs.current.set(c.id, el);
						}}
						className="absolute whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider shadow-lg"
						style={{
							left: 0,
							top: 0,
							visibility: "hidden",
							borderColor: color,
							color,
							background: "rgba(15,15,18,0.92)",
							willChange: "transform",
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
