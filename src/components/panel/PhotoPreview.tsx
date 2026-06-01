"use client";

import { useState } from "react";
import { ExternalLink, ImageIcon } from "@/lib/icons";
import type { ImageMeta } from "@/types/graph";

interface PhotoPreviewProps {
	id: string;
	meta?: ImageMeta;
	year?: number;
	confianza?: number;
}

export function PhotoPreview({ id, meta, year, confianza }: PhotoPreviewProps) {
	const [errored, setErrored] = useState(false);
	const showImage = meta?.url && !errored;

	return (
		<div className="px-5 pt-5">
			<div className="relative aspect-square overflow-hidden rounded-lg border border-border -elevated">
				{showImage ? (
					/* eslint-disable-next-line @next/next/no-img-element */
					<img
						src={meta!.url}
						alt={meta?.caption || id}
						loading="lazy"
						onError={() => setErrored(true)}
						className="h-full w-full object-cover"
					/>
				) : (
					<div className="flex h-full w-full flex-col items-center justify-center gap-2 text-fg-subtle">
						<ImageIcon size={32} />
						<span className="px-4 text-center text-[11px] leading-tight">
							Imagen no disponible localmente
						</span>
					</div>
				)}
			</div>

			<div className="mt-3 flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<h2
						className="truncate text-sm font-semibold text-fg"
						title={meta?.caption || id}
					>
						{meta?.caption || id}
					</h2>
					<p className="mt-0.5 truncate font-mono text-[10px] text-fg-subtle">
						{id}
					</p>
				</div>
				{meta?.url && meta.url.startsWith("http") && (
					<a
						href={meta.url}
						target="_blank"
						rel="noopener noreferrer"
						title="Ver original"
						className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-fg"
					>
						<ExternalLink size={13} />
					</a>
				)}
			</div>

			<dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11px] sm:grid-cols-2">
				{year != null && (
					<MetaRow label="Año predicho" value={String(year)} />
				)}
				{confianza != null && (
					<MetaRow label="Confianza" value={`${Math.round(confianza)}%`} />
				)}
				{meta?.nom_fons && <MetaRow label="Fondo" value={meta.nom_fons} />}
				{meta?.toponims && <MetaRow label="Topónimo" value={meta.toponims} />}
				{meta?.noms_propis && (
					<MetaRow label="Personas" value={meta.noms_propis} />
				)}
			</dl>
		</div>
	);
}

function MetaRow({ label, value }: { label: string; value: string }) {
	return (
		<>
			<dt className="text-fg-subtle">{label}</dt>
			<dd className="truncate text-[var(--color-fg-muted)]" title={value}>
				{value}
			</dd>
		</>
	);
}
