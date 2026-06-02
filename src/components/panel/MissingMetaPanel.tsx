"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { useGraphContext } from "@/context/GraphDataContext";
import { useExplorerState } from "@/hooks/useExplorerState";
import { Check, Copy, FileQuestion, Search, X } from "@/lib/icons";

interface MissingMetaPanelProps {
	open: boolean;
	onClose: () => void;
}

interface MissingItem {
	id: string;
	missingTitle: boolean;
	missingDescription: boolean;
	year?: number;
}

/**
 * Lists image nodes that have no entry in `photo-meta.json`, or whose entry
 * lacks both `title` and `description`. Click any row to select the node.
 */
export function MissingMetaPanel({ open, onClose }: MissingMetaPanelProps) {
	const { graph, photoMeta } = useGraphContext();
	const { setSelected } = useExplorerState();
	const [query, setQuery] = useState("");
	const [copied, setCopied] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);

	const items = useMemo<MissingItem[]>(() => {
		const out: MissingItem[] = [];
		graph.forEachNode((id, attrs) => {
			if (attrs.dimension !== "imagen") return;
			const m = photoMeta[id];
			const missingTitle = !m?.title;
			const missingDescription = !m?.description;
			if (!missingTitle && !missingDescription) return;
			out.push({
				id,
				missingTitle,
				missingDescription,
				year: attrs.year as number | undefined,
			});
		});
		out.sort((a, b) => a.id.localeCompare(b.id));
		return out;
	}, [graph, photoMeta]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return items;
		return items.filter((it) => it.id.toLowerCase().includes(q));
	}, [items, query]);

	useEffect(() => {
		if (open) {
			setQuery("");
			setCopied(false);
			queueMicrotask(() => inputRef.current?.focus());
		}
	}, [open]);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(filtered.map((it) => it.id).join("\n"));
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			/* clipboard unavailable */
		}
	};

	const select = (id: string) => {
		setSelected(id);
		onClose();
	};

	return (
		<AnimatePresence>
			{open && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.12 }}
					className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-3 pt-[8vh] backdrop-blur-sm sm:px-4 sm:pt-[12vh]"
					onClick={onClose}
				>
					<motion.div
						initial={{ y: -8, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: -8, opacity: 0 }}
						transition={{ duration: 0.14 }}
						className="w-full max-w-xl overflow-hidden rounded-xl border border-border-strong bg-[#161410] shadow-2xl"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
							<FileQuestion size={15} className="text-fg-subtle" />
							<div className="min-w-0 flex-1 leading-tight">
								<h2 className="truncate text-sm font-semibold text-fg">
									Fotos sin metadatos
								</h2>
								<p className="truncate text-[10px] text-fg-subtle">
									{items.length} nodo{items.length === 1 ? "" : "s"} sin título o
									descripción en{" "}
									<code className="font-mono">photo-meta.json</code>
								</p>
							</div>
							<button
								type="button"
								onClick={copy}
								disabled={filtered.length === 0}
								title="Copiar IDs al portapapeles"
								className="flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-[11px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
							>
								{copied ? <Check size={12} /> : <Copy size={12} />}
								{copied ? "Copiado" : "Copiar"}
							</button>
							<button
								type="button"
								onClick={onClose}
								aria-label="Cerrar"
								className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-[var(--color-bg-overlay)] hover:text-fg"
							>
								<X size={14} />
							</button>
						</div>

						<div className="flex items-center gap-2.5 border-b border-border px-4 py-2.5">
							<Search size={13} className="text-fg-subtle" />
							<input
								ref={inputRef}
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Filtrar por ID…"
								className="flex-1 bg-transparent text-xs text-fg placeholder:text-fg-subtle focus:outline-none"
								spellCheck={false}
								autoComplete="off"
							/>
							{query && (
								<span className="text-[10px] text-fg-subtle">
									{filtered.length}/{items.length}
								</span>
							)}
						</div>

						<MissingMetaList items={filtered} onSelect={select} />
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

function MissingMetaList({
	items,
	onSelect,
}: {
	items: MissingItem[];
	onSelect: (id: string) => void;
}) {
	if (items.length === 0) {
		return (
			<p className="px-4 py-8 text-center text-xs text-fg-subtle">
				Nada por aquí.
			</p>
		);
	}

	return (
		<div className="scroll-thin max-h-[60vh] overflow-y-auto py-1 sm:max-h-[50vh]">
			{items.map((it) => (
				<button
					key={it.id}
					type="button"
					onClick={() => onSelect(it.id)}
					className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-[var(--color-bg-overlay)]"
				>
					<span
						aria-hidden
						className="h-2 w-2 shrink-0 rounded-full bg-amber-400/80"
					/>
					<span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg">
						{it.id}
					</span>
					<span className="flex shrink-0 items-center gap-1">
						{it.missingTitle && (
							<span className="rounded bg-amber-400/15 px-1 py-0.5 text-[9px] uppercase tracking-wide text-amber-600 dark:text-amber-400">
								título
							</span>
						)}
						{it.missingDescription && (
							<span className="rounded bg-amber-400/15 px-1 py-0.5 text-[9px] uppercase tracking-wide text-amber-600 dark:text-amber-400">
								desc
							</span>
						)}
					</span>
					{it.year != null && (
						<span className="shrink-0 text-[10px] text-fg-subtle">{it.year}</span>
					)}
				</button>
			))}
		</div>
	);
}
