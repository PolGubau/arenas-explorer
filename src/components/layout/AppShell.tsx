"use client";

import type Graph from "graphology";
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
	Network,
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
	const [panelOpen, setPanelOpen] = useState(true);
	const [paletteOpen, setPaletteOpen] = useState(false);
	const { setSelected } = useExplorerState();

	const openPalette = useCallback(() => setPaletteOpen(true), []);
	const closePalette = useCallback(() => setPaletteOpen(false), []);

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
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [paletteOpen, setSelected]);

	return (
		<div className="flex h-dvh w-screen flex-col bg-[var(--color-bg)]">
			<Header onOpenPalette={openPalette} />
			<main className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_minmax(320px,28rem)]">
				<section className="relative min-h-0 overflow-hidden border-b border-[var(--color-border)] md:border-b-0 md:border-r">
					<div className="absolute left-4 right-4 top-4 z-10 flex flex-wrap items-center gap-2">
						<LayerFilter />
					</div>
					<GraphCanvas graph={graph} />
					<LegendHint />
				</section>
				<section
					className={`min-h-0 ${panelOpen ? "block" : "hidden md:block"}`}
				>
					<DetailPanel onClose={() => setPanelOpen(false)} />
				</section>
			</main>
			<Footer />
			<CommandPalette open={paletteOpen} onClose={closePalette} />
		</div>
	);
}

function Header({ onOpenPalette }: { onOpenPalette: () => void }) {
	return (
		<header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-3">
			<div className="flex items-center gap-2.5">
				<span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-accent)]">
					<Network size={14} />
				</span>
				<div className="leading-tight">
					<h1 className="text-sm font-semibold tracking-tight text-[var(--color-fg)]">
						Fondo Fotográfico Areñas
					</h1>
					<p className="text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
						Explorador semántico · 1909—1935
					</p>
				</div>
			</div>
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={onOpenPalette}
					className="group flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2.5 py-1.5 text-[11px] text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
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
		<footer className="flex shrink-0 items-center justify-between gap-4 border-t border-[var(--color-border)] px-5 py-2 text-[10px] text-[var(--color-fg-subtle)]">
			<span>740 nodos · 4120 aristas · ForceAtlas2 pre-calculado</span>
			<a
				href="https://polgubau.com"
				target="_blank"
				rel="noopener noreferrer"
				className="font-medium text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-fg)]"
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
