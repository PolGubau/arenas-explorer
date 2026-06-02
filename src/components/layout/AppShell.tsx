"use client";

import { AnimatePresence, motion } from "framer-motion";
import type Graph from "graphology";
import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CommandPalette } from "@/components/CommandPalette";
import { LayerFilter } from "@/components/graph/LayerFilter";
import { DetailPanel } from "@/components/panel/DetailPanel";
import { MissingPhotosPanel } from "@/components/panel/MissingPhotosPanel";
import { GraphDataProvider, useGraphContext } from "@/context/GraphDataContext";
import { useExplorerState } from "@/hooks/useExplorerState";
import { useGraphData } from "@/hooks/useGraphData";
import { useImagePreload } from "@/hooks/useImagePreload";
import {
	AlertTriangle,
	Command,
	ImageOff,
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
	const { graph, imagesIndex, communities, loading, error } = useGraphData();

	if (error) return <ErrorState message={error.message} />;
	if (loading || !graph) return <GlobalLoading />;

	return (
		<GraphDataProvider
			graph={graph}
			imagesIndex={imagesIndex}
			communities={communities}
		>
			<Suspense fallback={<GlobalLoading />}>
				<MainLayout graph={graph} />
			</Suspense>
		</GraphDataProvider>
	);
}

function MainLayout({ graph }: { graph: Graph; imagesIndex?: ImagesIndex }) {
	const [panelOpen, setPanelOpen] = useState(false);
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [missingOpen, setMissingOpen] = useState(false);
	const { nodeId, setSelected } = useExplorerState();
	const hasSelection = nodeId != null && graph.hasNode(nodeId);

	// Track "ever-opened" so we only mount the heavy palette/missing panels
	// after the user has first invoked them. Their internal `useMemo` indexes
	// (740-node walks) would otherwise run on app startup for nothing.
	const paletteEverOpened = useRef(false);
	const missingEverOpened = useRef(false);
	if (paletteOpen) paletteEverOpened.current = true;
	if (missingOpen) missingEverOpened.current = true;

	const openPalette = useCallback(() => setPaletteOpen(true), []);
	const closePalette = useCallback(() => setPaletteOpen(false), []);
	// Closing the panel (X button, mobile drag handle, mobile backdrop, Esc)
	// must also clear the selection so the URL, the graph highlight and the
	// "Ver detalles" FAB stay in sync.
	const closePanel = useCallback(() => {
		setSelected(null);
		setPanelOpen(false);
	}, [setSelected]);
	const openMissing = useCallback(() => setMissingOpen(true), []);
	const closeMissing = useCallback(() => setMissingOpen(false), []);

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
			<Header onOpenPalette={openPalette} onOpenMissing={openMissing} />
			<main className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_minmax(300px,22rem)] lg:grid-cols-[1fr_minmax(320px,25rem)] xl:grid-cols-[1fr_minmax(360px,28rem)]">
				<section
					className="relative min-h-0 overflow-hidden"
					aria-label="Grafo interactivo del Fondo Fotográfico Areñas"
					role="application"
				>
					<div className="absolute left-3 right-3 top-3 z-10 sm:left-4 sm:right-4 sm:top-4">
						<LayerFilter />
					</div>
					<GraphCanvas graph={graph} />
					<ImagePreloaderOverlay />
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
						className="pb-safe fixed bottom-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-border-strong -elevated/95 px-3.5 py-2 text-[11px] font-medium text-fg shadow-lg backdrop-blur md:hidden"
					>
						<PanelRightOpen size={13} />
						Ver detalles
					</motion.button>
				)}
			</AnimatePresence>

			{paletteEverOpened.current && (
				<CommandPalette open={paletteOpen} onClose={closePalette} />
			)}
			{missingEverOpened.current && (
				<MissingPhotosPanel open={missingOpen} onClose={closeMissing} />
			)}
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
						className="pb-safe fixed inset-x-0 bottom-0 z-40 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl border border-border bg-[var(--color-bg)] shadow-2xl"
					>
						<div className="flex shrink-0 items-center justify-center py-2">
							<button
								type="button"
								onClick={onClose}
								aria-label="Cerrar panel"
								className="h-1.5 w-12 rounded-full bg-border-strong transition-colors hover:-fg-subtle"
							/>
						</div>
						<div className="min-h-0 flex-1 overflow-hidden">{children}</div>
					</motion.aside>
				)}
			</AnimatePresence>
		</div>
	);
}

function Header({
	onOpenPalette,
	onOpenMissing,
}: {
	onOpenPalette: () => void;
	onOpenMissing: () => void;
}) {
	const { graph, imagesIndex } = useGraphContext();
	const missingCount = useMissingCount(graph, imagesIndex);

	return (
		<header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2.5 sm:px-5 sm:py-3">
			<div className="flex min-w-0 items-center gap-2.5">
				<div className="min-w-0 leading-tight">
					<h1 className="truncate text-sm font-semibold tracking-tight text-fg">
						Fondo Fotográfico Areñas
					</h1>
					<p className="hidden truncate text-[10px] uppercase tracking-wider text-fg-subtle sm:block">
						Exploración semántica del patrimonio
					</p>
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-2 sm:gap-3">
				{missingCount > 0 && (
					<button
						type="button"
						onClick={onOpenMissing}
						title={`${missingCount} foto${missingCount === 1 ? "" : "s"} sin imagen`}
						aria-label="Ver fotos sin imagen"
						className="group flex items-center gap-1.5 rounded-md border border-border -elevated px-2 py-1.5 text-[11px] text-fg-muted transition-colors hover:border-strong hover:text-fg"
					>
						<ImageOff size={12} />
						<span className="font-mono tabular-nums">{missingCount}</span>
						<span className="hidden sm:inline">sin imagen</span>
					</button>
				)}
				<button
					type="button"
					onClick={onOpenPalette}
					className="group flex items-center gap-2 rounded-md border border-border -elevated px-2 py-1.5 text-[11px] text-fg-muted transition-colors hover:border-[var(--color-borde)] hover:text-fg sm:px-2.5"
					aria-label="Buscar nodo"
				>
					<Search size={12} />
					<span className="hidden sm:inline">Buscar…</span>
					<kbd className="ml-1 hidden items-center gap-0.5 rounded border border-border px-1 py-px text-[9px] text-fg-subtle sm:inline-flex">
						<Command size={9} />K
					</kbd>
				</button>
			</div>
		</header>
	);
}

function useMissingCount(
	graph: Graph,
	imagesIndex: ImagesIndex,
): number {
	return useMemo(() => {
		let n = 0;
		graph.forEachNode((id, attrs) => {
			if (attrs.dimension !== "imagen") return;
			if (!imagesIndex[id]?.url) n++;
		});
		return n;
	}, [graph, imagesIndex]);
}

function Footer() {
	return (
		<footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-3 py-2 text-[10px] text-fg-subtle sm:px-5">
			<span className="hidden truncate sm:inline">
				740 nodos · 4120 aristas · ForceAtlas2 pre-calculado
			</span>
			<a
				href="https://polgubau.com"
				target="_blank"
				rel="noopener noreferrer"
				className="ml-auto font-medium text-fg-muted transition-colors hover:text-fg"
			>
				polgubau.com
			</a>
		</footer>
	);
}

/**
 * Full-cover overlay shown while the browser warms its image cache. Sigma's
 * NodeImageProgram would otherwise pop low-res stubs in and out as fetches
 * resolve; pre-loading first means textures upload from cache and the canvas
 * looks finished on first paint. Fades out via framer-motion once the hook
 * reports ready (all images settled or 8s cap reached).
 */
function ImagePreloaderOverlay() {
	const { imagesIndex } = useGraphContext();
	const { ready, progress, loaded, total } = useImagePreload(imagesIndex);
	const pct = Math.round(progress * 100);

	return (
		<AnimatePresence>
			{!ready && (
				<motion.div
					key="preloader"
					initial={{ opacity: 1 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.45, ease: "easeOut" }}
					className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[var(--color-bg)]/85 backdrop-blur-sm"
					aria-hidden={ready}
				>
					<div className="flex w-64 max-w-[80%] flex-col items-center gap-3 text-fg-muted">
						<div className="flex items-center gap-2 text-xs">
							<Loader2 size={14} className="animate-spin" />
							<span>Precargando imágenes…</span>
						</div>
						<div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
							<motion.div
								className="h-full bg-fg"
								initial={{ width: 0 }}
								animate={{ width: `${pct}%` }}
								transition={{ duration: 0.2, ease: "linear" }}
							/>
						</div>
						<span className="font-mono text-[10px] tabular-nums text-fg-subtle">
							{loaded} / {total}
						</span>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

function LegendHint() {
	return (
		<div className="pointer-events-none absolute bottom-4 right-4 z-10 hidden items-center gap-1.5 rounded-md border border-border -elevated/80 px-2.5 py-1.5 text-[10px] text-fg-subtle backdrop-blur md:flex">
			<Info size={11} />
			<span>Pulsa un nodo para inspeccionarlo</span>
		</div>
	);
}

function GlobalLoading() {
	return (
		<div className="flex h-dvh w-screen items-center justify-center bg-[var(--color-bg)]">
			<div className="flex items-center gap-3 text-fg-muted">
				<Loader2 size={18} className="animate-spin" />
				<span className="text-sm">Cargando grafo y texturas…</span>
			</div>
		</div>
	);
}

function CanvasLoading() {
	return (
		<div className="flex h-full w-full items-center justify-center text-fg-subtle">
			<Loader2 size={18} className="animate-spin" />
		</div>
	);
}

function ErrorState({ message }: { message: string }) {
	return (
		<div className="flex h-dvh w-screen items-center justify-center bg-[var(--color-bg)] px-6">
			<div className="flex max-w-sm flex-col items-center gap-3 rounded-lg border border-border -elevated p-6 text-center">
				<AlertTriangle size={22} className="text-[var(--color-dim-anio)]" />
				<h2 className="text-sm font-semibold text-fg">
					No se pudo cargar el grafo
				</h2>
				<p className="text-xs text-fg-muted">{message}</p>
			</div>
		</div>
	);
}
