"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type Graph from "graphology";

import { GraphDataProvider } from "@/context/GraphDataContext";
import { useGraphData } from "@/hooks/useGraphData";
import { LayerFilter } from "@/components/graph/LayerFilter";
import { DetailPanel } from "@/components/panel/DetailPanel";
import { AlertTriangle, Info, Loader2, Network } from "@/lib/icons";
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
			<MainLayout graph={graph} />
		</GraphDataProvider>
	);
}

function MainLayout({ graph }: { graph: Graph; imagesIndex?: ImagesIndex }) {
	const [panelOpen, setPanelOpen] = useState(true);

	return (
		<div className="flex h-dvh w-screen flex-col bg-[var(--color-bg)]">
			<Header />
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
		</div>
	);
}

function Header() {
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
			<div className="hidden items-center gap-2 text-[10px] text-[var(--color-fg-subtle)] md:flex">
				<span>TFM en humanidades digitales</span>
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
