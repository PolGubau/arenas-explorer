"use client";

import type Graph from "graphology";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useState } from "react";

import { CommandPalette } from "@/components/CommandPalette";
import { LayerFilter } from "@/components/graph/LayerFilter";
import { DetailPanel } from "@/components/panel/DetailPanel";
import { GraphDataProvider } from "@/context/GraphDataContext";
import { useExplorerState } from "@/hooks/useExplorerState";
import { useGraphData } from "@/hooks/useGraphData";
import {
	AlertTriangle,
	Command,
	Info,
	Loader2,
	PanelRightOpen,
	Search,
} from "@/lib/icons";
import type { ImagesIndex } from "@/types/graph";

const GraphCanvas = dynamic(
	() =>
		import("@/components/graph/GraphCanvas").then((m) => ({
			default: m.GraphCanvas,
		})),
	{ ssr: false, loading: () => <CanvasLoading /> },
);

export function AppShell() {
	const { graph, imagesIndex, loading, error } = useGraphData();

	if (error) return <ErrorState message={error.message} />;
	if (loading || !graph) return <GlobalLoading />;

	return (
		<GraphDataProvider graph={graph} imagesIndex={imagesIndex}>
			<Suspense fallback={<GlobalLoading />}>
				<MainLayout graph={graph} />
			</Suspense>
		</GraphDataProvider>
	);
}

function MainLayout({ graph }: { graph: Graph; imagesIndex?: ImagesIndex }) {
	const [panelOpen, setPanelOpen] = useState(false);
	const [paletteOpen, setPaletteOpen] = useState(false);
	const { nodeId, setSelected } = useExplorerState();
	const hasSelection = nodeId != null && graph.hasNode(nodeId);

	const openPalette = useCallback(() => setPaletteOpen(true), []);
	const closePalette = useCallback(() => setPaletteOpen(false), []);
	const closePanel = useCallback(() => setPanelOpen(false), []);

	// On mobile, auto-open the bottom sheet whenever a new node is selected.
	useEffect(() => {
		if (hasSelection) setPanelOpen(true);
	}, [hasSelection, nodeId]);

	// Global shortcuts: Cmd/Ctrl+K or "/" opens the palette, Esc deselects.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			const isTyping =
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable);

			if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setPaletteOpen((v) => !v);
				return;
			}
			if (e.key === "/" && !isTyping && !paletteOpen) {
				e.preventDefault();
				setPaletteOpen(true);
				return;
			}
			if (e.key === "Escape" && !paletteOpen && !isTyping) {
				setSelected(null);
				setPanelOpen(false);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [paletteOpen, setSelected]);

	return (
		<div className="flex h-dvh w-screen flex-col bg-[var(--color-bg)]">
			<Header onOpenPalette={openPalette} />
			<main className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_minmax(320px,28rem)]">
				<section className="relative min-h-0 overflow-hidden">
					<div className="absolute left-3 right-3 top-3 z-10 sm:left-4 sm:right-4 sm:top-4">
						<LayerFilter />
					</div>
					<GraphCanvas graph={graph} />
					<LegendHint />
				</section>
				{/* Desktop side panel */}
				<section className="hidden min-h-0 md:block">
					<DetailPanel onClose={closePanel} />
				</section>
			</main>
			<Footer />

			{/* Mobile bottom sheet (rendered outside the grid) */}
			<MobileSheet open={panelOpen} onClose={closePanel}>
				<DetailPanel onClose={closePanel} />
			</MobileSheet>

			{/* Mobile FAB to re-open the sheet when minimised */}
			<AnimatePresence>
				{hasSelection && !panelOpen && (
					<motion.button
						type="button"
						onClick={() => setPanelOpen(true)}
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 12 }}
						transition={{ duration: 0.18 }}
						className="pb-safe fixed bottom-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)]/95 px-3.5 py-2 text-[11px] font-medium text-[var(--color-fg)] shadow-lg backdrop-blur md:hidden"
					>
						<PanelRightOpen size={13} />
						Ver detalles
					</motion.button>
				)}
			</AnimatePresence>

			<CommandPalette open={paletteOpen} onClose={closePalette} />
		</div>
	);
}

function MobileSheet({
	open,
	onClose,
	children,
}: {
	open: boolean;
	onClose: () => void;
	children: React.ReactNode;
}) {
	return (
		<div className="md:hidden">
			<AnimatePresence>
				{open && (
					<motion.div
						key="backdrop"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18 }}
						className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
						onClick={onClose}
					/>
				)}
			</AnimatePresence>
			<AnimatePresence>
				{open && (
					<motion.aside
						key="sheet"
						initial={{ y: "100%" }}
						animate={{ y: 0 }}
						exit={{ y: "100%" }}
						transition={{ type: "tween", duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
						className="pb-safe fixed inset-x-0 bottom-0 z-40 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl"
					>
						<div className="flex shrink-0 items-center justify-center py-2">
							<button
								type="button"
								onClick={onClose}
								aria-label="Cerrar panel"
								className="h-1.5 w-12 rounded-full bg-[var(--color-border-strong)] transition-colors hover:bg-[var(--color-fg-subtle)]"
							/>
						</div>
						<div className="min-h-0 flex-1 overflow-hidden">{children}</div>
					</motion.aside>
				)}
			</AnimatePresence>
		</div>
	);
}

function Header({ onOpenPalette }: { onOpenPalette: () => void }) {
	return (
		<header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 py-2.5 sm:px-5 sm:py-3">
			<div className="flex min-w-0 items-center gap-2.5">
				<div className="min-w-0 leading-tight">
					<h1 className="truncate text-sm font-semibold tracking-tight text-[var(--color-fg)]">
						Fondo Fotográfico Areñas
					</h1>
					<p className="hidden truncate text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)] sm:block">
						Exploración semántica del patrimonio
					</p>
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-3">
				<button
					type="button"
					onClick={onOpenPalette}
					className="group flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2 py-1.5 text-[11px] text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)] sm:px-2.5"
					aria-label="Buscar nodo"
				>
					<Search size={12} />
					<span className="hidden sm:inline">Buscar…</span>
					<kbd className="ml-1 hidden items-center gap-0.5 rounded border border-[var(--color-border)] px-1 py-px text-[9px] text-[var(--color-fg-subtle)] sm:inline-flex">
						<Command size={9} />K
					</kbd>
				</button>
				<span className="hidden text-[10px] text-[var(--color-fg-subtle)] md:inline">
					TFM en humanidades digitales
				</span>
			</div>
		</header>
	);
}

function Footer() {
	return (
		<footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--color-border)] px-3 py-2 text-[10px] text-[var(--color-fg-subtle)] sm:px-5">
			<span className="hidden truncate sm:inline">
				740 nodos · 4120 aristas · ForceAtlas2 pre-calculado
			</span>
			<a
				href="https://polgubau.com"
				target="_blank"
				rel="noopener noreferrer"
				className="ml-auto font-medium text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-fg)]"
			>
				polgubau.com
			</a>
		</footer>
	);
}

function LegendHint() {
	return (
		<div className="pointer-events-none absolute bottom-4 right-4 z-10 hidden items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/80 px-2.5 py-1.5 text-[10px] text-[var(--color-fg-subtle)] backdrop-blur md:flex">
			<Info size={11} />
			<span>Pulsa un nodo para inspeccionarlo</span>
		</div>
	);
}

function GlobalLoading() {
	return (
		<div className="flex h-dvh w-screen items-center justify-center bg-[var(--color-bg)]">
			<div className="flex items-center gap-3 text-[var(--color-fg-muted)]">
				<Loader2 size={18} className="animate-spin" />
				<span className="text-sm">Cargando grafo y texturas…</span>
			</div>
		</div>
	);
}

function CanvasLoading() {
	return (
		<div className="flex h-full w-full items-center justify-center text-[var(--color-fg-subtle)]">
			<Loader2 size={18} className="animate-spin" />
		</div>
	);
}

function ErrorState({ message }: { message: string }) {
	return (
		<div className="flex h-dvh w-screen items-center justify-center bg-[var(--color-bg)] px-6">
			<div className="flex max-w-sm flex-col items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 text-center">
				<AlertTriangle size={22} className="text-[var(--color-dim-anio)]" />
				<h2 className="text-sm font-semibold text-[var(--color-fg)]">
					No se pudo cargar el grafo
				</h2>
				<p className="text-xs text-[var(--color-fg-muted)]">{message}</p>
			</div>
		</div>
	);
}
