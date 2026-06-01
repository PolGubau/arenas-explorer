"use client";

import { useGraphContext } from "@/context/GraphDataContext";
import { useExplorerState } from "@/hooks/useExplorerState";
import { DIMENSION_COLORS, DIMENSION_LABELS } from "@/lib/constants";
import { CornerDownLeft, Search } from "@/lib/icons";
import type { Dimension } from "@/types/graph";
import { AnimatePresence, motion } from "framer-motion";
import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

interface CommandPaletteProps {
	open: boolean;
	onClose: () => void;
}

interface Hit {
	id: string;
	label: string;
	dimension: Dimension;
	degree: number;
}

const MAX_RESULTS = 40;

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
	const { graph } = useGraphContext();
	const { setSelected } = useExplorerState();
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const [active, setActive] = useState(0);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const listRef = useRef<HTMLDivElement | null>(null);

	// Build a flat index once per graph instance.
	const index = useMemo<Hit[]>(() => {
		const out: Hit[] = [];
		graph.forEachNode((id, attrs) => {
			out.push({
				id,
				label: String(attrs.label ?? id),
				dimension: (attrs.dimension as Dimension) ?? "imagen",
				degree: (attrs.degree as number) ?? graph.degree(id),
			});
		});
		out.sort((a, b) => b.degree - a.degree);
		return out;
	}, [graph]);

	const results = useMemo<Hit[]>(() => {
		const q = deferredQuery.trim().toLowerCase();
		if (!q) return index.slice(0, MAX_RESULTS);
		const out: Hit[] = [];
		for (let i = 0; i < index.length && out.length < MAX_RESULTS; i++) {
			const h = index[i];
			if (!h) continue;
			if (h.label.toLowerCase().includes(q) || h.id.toLowerCase().includes(q)) {
				out.push(h);
			}
		}
		return out;
	}, [index, deferredQuery]);

	useEffect(() => {
		if (open) {
			setQuery("");
			setActive(0);
			queueMicrotask(() => inputRef.current?.focus());
		}
	}, [open]);

	useEffect(() => {
		setActive(0);
	}, [deferredQuery]);

	const commit = useCallback(
		(hit?: Hit) => {
			const target = hit ?? results[active];
			if (!target) return;
			setSelected(target.id);
			onClose();
		},
		[results, active, setSelected, onClose],
	);

	const onKey = (e: React.KeyboardEvent) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActive((i) => Math.min(i + 1, results.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActive((i) => Math.max(i - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			commit();
		} else if (e.key === "Escape") {
			e.preventDefault();
			onClose();
		}
	};

	useEffect(() => {
		const el = listRef.current?.querySelector<HTMLElement>(
			`[data-idx="${active}"]`,
		);
		el?.scrollIntoView({ block: "nearest" });
	}, [active]);

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
						className="w-full max-w-xl overflow-hidden rounded-xl border border-border-strong -elevated shadow-2xl"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
							<Search size={15} className="text-fg-subtle" />
							<input
								ref={inputRef}
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onKeyDown={onKey}
								placeholder="Buscar nodo: foto, año, prenda o palabra…"
								className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
								spellCheck={false}
								autoComplete="off"
							/>
							<kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-fg-subtle sm:inline">
								Esc
							</kbd>
						</div>
						<div
							ref={listRef}
							className="scroll-thin max-h-[60vh] overflow-y-auto py-1 sm:max-h-[50vh]"
						>
							{results.length === 0 ? (
								<p className="px-4 py-6 text-center text-xs text-fg-subtle">
									Sin resultados para «{query}»
								</p>
							) : (
								results.map((h, i) => (
									<button
										key={h.id}
										type="button"
										data-idx={i}
										onMouseEnter={() => setActive(i)}
										onClick={() => commit(h)}
										className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors ${i === active
											? "bg-[var(--color-bg-overlay)] text-fg"
											: "text-fg-muted"
											}`}
									>
										<span
											aria-hidden
											className="h-2 w-2 shrink-0 rounded-full"
											style={{ backgroundColor: DIMENSION_COLORS[h.dimension] }}
										/>
										<span className="min-w-0 flex-1 truncate">{h.label}</span>
										<span className="hidden text-[10px] uppercase tracking-wide text-fg-subtle sm:inline">
											{DIMENSION_LABELS[h.dimension]}
										</span>
										{i === active && (
											<CornerDownLeft
												size={12}
												className="text-fg-subtle"
											/>
										)}
									</button>
								))
							)}
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
