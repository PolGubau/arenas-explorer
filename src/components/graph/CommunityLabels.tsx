"use client";

import { useGraphContext } from "@/context/GraphDataContext";
import { useExplorerState } from "@/hooks/useExplorerState";
import { COMMUNITY_COLORS } from "@/lib/constants";
import { useSigma } from "@react-sigma/core";
import { useEffect, useState } from "react";

interface ChipPos {
	x: number;
	y: number;
}

/**
 * Floating chips rendered at each community centroid (in graph coords),
 * re-projected to viewport pixels whenever the camera moves or Sigma
 * re-renders. Always visible (independent of the `colorByCommunity` toggle);
 * chip color follows the community palette when the toggle is active,
 * neutral otherwise.
 *
 * Implementation notes:
 * - Positions are kept in React state so the chips are part of the normal
 *   render cycle and don't drift after parent re-renders.
 * - `sigma.graphToViewport` can return non-finite values before the graph
 *   has been processed (empty graph at mount time); chips without a valid
 *   position are simply not rendered that tick.
 * - Listeners on `afterRender` + camera `updated` cover both initial graph
 *   load and continuous user pan/zoom.
 */
export function CommunityLabels() {
	const sigma = useSigma();
	const { communities } = useGraphContext();
	const { colorByCommunity } = useExplorerState();
	const [positions, setPositions] = useState<Map<number, ChipPos>>(new Map());

	useEffect(() => {
		if (communities.length === 0) return;

		const recompute = () => {
			const next = new Map<number, ChipPos>();
			for (const c of communities) {
				try {
					const pos = sigma.graphToViewport({ x: c.x, y: c.y });
					if (Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
						next.set(c.id, { x: pos.x, y: pos.y });
					}
				} catch {
					// graph not ready yet — skip this tick
				}
			}
			setPositions((prev) => {
				if (prev.size !== next.size) return next;
				for (const [id, p] of next) {
					const q = prev.get(id);
					if (!q || q.x !== p.x || q.y !== p.y) return next;
				}
				return prev;
			});
		};

		const camera = sigma.getCamera();
		camera.on("updated", recompute);
		sigma.on("afterRender", recompute);
		// Kick once on mount so chips show up even if no event has fired yet.
		recompute();

		return () => {
			camera.off("updated", recompute);
			sigma.off("afterRender", recompute);
		};
	}, [sigma, communities]);

	if (communities.length === 0) return null;

	return (
		<div className="pointer-events-none absolute inset-0 z-30">
			{communities.map((c) => {
				const pos = positions.get(c.id);
				if (!pos) return null;
				const color = COMMUNITY_COLORS[c.id % COMMUNITY_COLORS.length];
				const borderColor = colorByCommunity ? color : "rgba(255,255,255,0.35)";
				const textColor = colorByCommunity ? color : "#e4e4e7";
				return (
					<div
						key={c.id}
						className="absolute whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider shadow-lg"
						style={{
							left: 0,
							top: 0,
							transform: `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`,
							borderColor,
							color: textColor,
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
