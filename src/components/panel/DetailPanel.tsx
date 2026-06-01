"use client";

import { useGraphContext } from "@/context/GraphDataContext";
import { useExplorerState } from "@/hooks/useExplorerState";
import { useNodeNeighbors } from "@/hooks/useNodeNeighbors";
import { DIMENSION_LABELS } from "@/lib/constants";
import { Calendar, ImageIcon, Shirt, TypeIcon, X } from "@/lib/icons";
import type { Dimension } from "@/types/graph";
import { AnimatePresence, motion } from "framer-motion";

import { ShareButton } from "./ShareButton";

import { Chip } from "./Chip";
import { ConnectionSection } from "./ConnectionSection";
import { DimensionBadge } from "./DimensionBadge";
import { HubView } from "./HubView";
import { PhotoPreview } from "./PhotoPreview";
import { RelatedThumb } from "./RelatedThumb";

interface DetailPanelProps {
	onClose?: () => void;
}

export function DetailPanel({ onClose }: DetailPanelProps) {
	const { nodeId: selectedNodeId } = useExplorerState();
	const { graph } = useGraphContext();

	const hasNode =
		selectedNodeId != null && graph.hasNode(selectedNodeId);

	return (
		<aside className="scroll-thin flex h-full flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-bg)]">
			<AnimatePresence mode="wait">
				{hasNode ? (
					<motion.div
						key={selectedNodeId}
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.18 }}
					>
						<DetailHeader onClose={onClose} />
						<DetailBody nodeId={selectedNodeId!} />
					</motion.div>
				) : (
					<EmptyState />
				)}
			</AnimatePresence>
		</aside>
	);
}

function DetailHeader({ onClose }: { onClose?: () => void }) {
	const { nodeId: selectedNodeId, setSelected } = useExplorerState();
	const { graph } = useGraphContext();
	if (!selectedNodeId || !graph.hasNode(selectedNodeId)) return null;

	const dimension = graph.getNodeAttribute(selectedNodeId, "dimension") as Dimension;
	return (
		<div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3">
			<DimensionBadge dimension={dimension} />
			<div className="flex items-center gap-1">
				<ShareButton />
				<button
					type="button"
					onClick={() => {
						setSelected(null);
						onClose?.();
					}}
					aria-label="Cerrar panel"
					title="Cerrar (Esc)"
					className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg)]"
				>
					<X size={14} />
				</button>
			</div>
		</div>
	);
}

function DetailBody({ nodeId }: { nodeId: string }) {
	const { graph } = useGraphContext();
	const dimension = graph.getNodeAttribute(nodeId, "dimension") as Dimension;

	switch (dimension) {
		case "imagen":
			return <ImageView nodeId={nodeId} />;
		case "año":
			return <YearView nodeId={nodeId} />;
		case "vestimenta":
			return <ClothingView nodeId={nodeId} />;
		case "transcripcion":
			return <WordView nodeId={nodeId} />;
		default:
			return null;
	}
}

function YearView({ nodeId }: { nodeId: string }) {
	const { graph } = useGraphContext();
	const { pertenece_a_año } = useNodeNeighbors(graph, nodeId);
	const label = graph.getNodeAttribute(nodeId, "label") as string;
	const nFotos = (graph.getNodeAttribute(nodeId, "n_fotos") as number | undefined) ?? pertenece_a_año.length;

	return (
		<HubView
			icon={<Calendar size={20} />}
			title={`Año ${label}`}
			subtitle={`${nFotos} fotografía${nFotos === 1 ? "" : "s"} datada${nFotos === 1 ? "" : "s"} en este año por el modelo`}
			photos={pertenece_a_año}
		/>
	);
}

function ClothingView({ nodeId }: { nodeId: string }) {
	const { graph } = useGraphContext();
	const { lleva_puesto } = useNodeNeighbors(graph, nodeId);
	const label = graph.getNodeAttribute(nodeId, "label") as string;

	return (
		<HubView
			icon={<Shirt size={20} />}
			title={label}
			subtitle={`Prenda detectada en ${lleva_puesto.length} fotografía${lleva_puesto.length === 1 ? "" : "s"}`}
			photos={lleva_puesto}
		/>
	);
}

function WordView({ nodeId }: { nodeId: string }) {
	const { graph } = useGraphContext();
	const { contiene_palabra } = useNodeNeighbors(graph, nodeId);
	const label = graph.getNodeAttribute(nodeId, "label") as string;

	return (
		<HubView
			icon={<TypeIcon size={20} />}
			title={`«${label}»`}
			subtitle={`Palabra transcrita por HTR en ${contiene_palabra.length} fotografía${contiene_palabra.length === 1 ? "" : "s"}`}
			photos={contiene_palabra}
		/>
	);
}

function EmptyState() {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-[var(--color-fg-subtle)]">
			<ImageIcon size={28} />
			<p className="text-sm">
				Selecciona un nodo del grafo para ver sus conexiones.
			</p>
			<p className="text-[11px] leading-relaxed">
				Las cuatro dimensiones disponibles son{" "}
				{Object.values(DIMENSION_LABELS).join(", ").toLowerCase()}.
			</p>
		</div>
	);
}

function ImageView({ nodeId }: { nodeId: string }) {
	const { graph, imagesIndex } = useGraphContext();
	const meta = imagesIndex[nodeId];
	const year = graph.getNodeAttribute(nodeId, "year") as number | undefined;
	const confianza = graph.getNodeAttribute(nodeId, "confianza") as number | undefined;
	const neighbours = useNodeNeighbors(graph, nodeId);

	return (
		<>
			<PhotoPreview id={nodeId} meta={meta} year={year} confianza={confianza} />

			<ConnectionSection
				title="Vestimenta"
				icon={<Shirt size={14} />}
				count={neighbours.lleva_puesto.length}
			>
				<div className="flex flex-wrap gap-1.5">
					{neighbours.lleva_puesto.map((id) => (
						<Chip key={id} id={id} label={id} dimension="vestimenta" />
					))}
				</div>
			</ConnectionSection>

			<ConnectionSection
				title={year ? `Mismo año · ${year}` : "Mismo año"}
				icon={<Calendar size={14} />}
				count={neighbours.mismo_año.length}
			>
				<div className="grid grid-cols-4 gap-1.5">
					{neighbours.mismo_año.slice(0, 32).map((id) => (
						<RelatedThumb key={id} id={id} />
					))}
				</div>
				{neighbours.mismo_año.length > 32 && (
					<p className="mt-2 text-[10px] text-[var(--color-fg-subtle)]">
						+{neighbours.mismo_año.length - 32} más
					</p>
				)}
			</ConnectionSection>

			<ConnectionSection
				title="Palabras HTR"
				icon={<TypeIcon size={14} />}
				count={neighbours.contiene_palabra.length}
			>
				<div className="flex flex-wrap gap-1.5">
					{neighbours.contiene_palabra.map((id) => (
						<Chip key={id} id={id} label={id} dimension="transcripcion" />
					))}
				</div>
			</ConnectionSection>
		</>
	);
}
