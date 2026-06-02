"use client";

import {
	Camera,
	ExternalLink,
	FileText,
	ImageIcon,
	Quote,
	User,
} from "@/lib/icons";
import type { ImageMeta, PhotoMeta } from "@/types/graph";
import { useState } from "react";

interface PhotoPreviewProps {
	id: string;
	meta?: ImageMeta;
	photoMeta?: PhotoMeta;
	year?: number;
	confianza?: number;
}

// Description above this length collapses behind a "Leer más" toggle so the
// panel stays scannable. Picked empirically — ~4 short lines at the current
// panel width.
const DESCRIPTION_COLLAPSE_THRESHOLD = 280;

export function PhotoPreview({
	id,
	meta,
	photoMeta,
	year,
	confianza,
}: PhotoPreviewProps) {
	const [errored, setErrored] = useState(false);
	const showImage = meta?.url && !errored;

	// `photoMeta.title` is the curator-authored title (human readable); fall
	// back to the existing caption (CSV-derived) and finally the raw id.
	const heading = photoMeta?.title || meta?.caption || id;

	return (
		<div className="px-5 pt-5 pb-5">
			<div className="relative aspect-square overflow-hidden rounded-lg border border-border -elevated">
				{showImage ? (
					/* eslint-disable-next-line @next/next/no-img-element */
					<img
						src={meta?.url}
						alt={heading}
						width={512}
						height={512}
						loading="lazy"
						decoding="async"
						fetchPriority="high"
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
					<h2 className="text-sm font-semibold leading-tight text-fg" title={heading}>
						{heading}
					</h2>
					<p className="mt-1 truncate font-mono text-[10px] text-fg-subtle">
						{id}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-1.5">
					{photoMeta?.archive && (
						<span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-muted">
							{photoMeta.archive}
						</span>
					)}
					{meta?.url?.startsWith("http") && (
						<a
							href={meta.url}
							target="_blank"
							rel="noopener noreferrer"
							title="Ver original"
							className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
						>
							<ExternalLink size={13} />
						</a>
					)}
				</div>
			</div>

			{(photoMeta?.author || photoMeta?.camera) && (
				<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-muted">
					{photoMeta.author && (
						<span className="inline-flex items-center gap-1" title="Autor">
							<User size={11} />
							<span className="truncate">{photoMeta.author}</span>
						</span>
					)}
					{photoMeta.camera && (
						<span className="inline-flex items-center gap-1" title="Cámara">
							<Camera size={11} />
							<span>{photoMeta.camera}</span>
						</span>
					)}
				</div>
			)}

			{photoMeta?.description && (
				<DescriptionBlock text={photoMeta.description} />
			)}

			{photoMeta?.observations && (
				<div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-[var(--color-bg-elevated,transparent)] px-3 py-2 text-[11px] italic leading-relaxed text-fg-muted">
					<Quote size={11} className="mt-0.5 shrink-0 text-fg-subtle" />
					<span>{photoMeta.observations}</span>
				</div>
			)}

			<dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11px] sm:grid-cols-2">
				{year != null && (
					<MetaRow label="Año predicho" value={String(year)} />
				)}
				{confianza != null && (
					<MetaRow label="Confianza" value={`${Math.round(confianza)}%`} />
				)}
				{photoMeta?.format && (
					<MetaRow label="Formato" value={photoMeta.format} />
				)}
				{photoMeta?.material && (
					<MetaRow label="Material" value={photoMeta.material} />
				)}
				{photoMeta?.state && <MetaRow label="Estado" value={photoMeta.state} />}
				{photoMeta?.damages && (
					<MetaRow label="Daños" value={photoMeta.damages} />
				)}
				{photoMeta?.manipulations && (
					<MetaRow label="Intervenciones" value={photoMeta.manipulations} />
				)}
				{photoMeta?.lastControl && (
					<MetaRow label="Último control" value={photoMeta.lastControl} />
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

function DescriptionBlock({ text }: { text: string }) {
	const collapsible = text.length > DESCRIPTION_COLLAPSE_THRESHOLD;
	const [expanded, setExpanded] = useState(false);
	const visible = collapsible && !expanded ? `${text.slice(0, DESCRIPTION_COLLAPSE_THRESHOLD).trimEnd()}…` : text;

	return (
		<div className="mt-3">
			<div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-subtle">
				<FileText size={10} />
				<span>Descripción</span>
			</div>
			<p className="whitespace-pre-line text-[12px] leading-relaxed text-fg-muted">
				{visible}
			</p>
			{collapsible && (
				<button
					type="button"
					onClick={() => setExpanded((v) => !v)}
					className="mt-1 text-[11px] font-medium text-fg transition-colors hover:text-fg-muted"
				>
					{expanded ? "Mostrar menos" : "Leer más"}
				</button>
			)}
		</div>
	);
}

function MetaRow({ label, value }: { label: string; value: string }) {
	return (
		<>
			<dt className="text-fg-subtle">{label}</dt>
			<dd className="truncate text-fg-muted" title={value}>
				{value}
			</dd>
		</>
	);
}
