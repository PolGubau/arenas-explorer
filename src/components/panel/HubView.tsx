"use client";

import { useState } from "react";
import { RelatedThumb } from "./RelatedThumb";

interface HubViewProps {
	icon: React.ReactNode;
	title: string;
	subtitle?: string;
	photos: string[];
}

const INITIAL_LIMIT = 48;
const STEP = 48;

export function HubView({ icon, title, subtitle, photos }: HubViewProps) {
	const [limit, setLimit] = useState(INITIAL_LIMIT);
	const visible = photos.slice(0, limit);
	const remaining = photos.length - visible.length;

	return (
		<div className="px-5 pt-5 pb-6">
			<header className="mb-4 flex items-start gap-3">
				<span className="mt-0.5 text-[var(--color-fg-muted)]">{icon}</span>
				<div className="min-w-0 flex-1">
					<h2 className="truncate text-base font-semibold text-fg">
						{title}
					</h2>
					{subtitle && (
						<p className="mt-1 text-[11px] leading-relaxed text-fg-subtle">
							{subtitle}
						</p>
					)}
				</div>
			</header>

			{photos.length === 0 ? (
				<p className="text-[11px] text-fg-subtle">
					Sin fotografías conectadas.
				</p>
			) : (
				<>
					<div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
						{visible.map((id) => (
							<RelatedThumb key={id} id={id} size={72} />
						))}
					</div>
					{remaining > 0 && (
						<button
							type="button"
							onClick={() => setLimit((l) => l + STEP)}
							className="mt-3 w-full rounded-md border border-border -elevated px-3 py-2 text-[11px] font-medium text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-fg"
						>
							Mostrar {Math.min(STEP, remaining)} más · {remaining} restantes
						</button>
					)}
				</>
			)}
		</div>
	);
}
