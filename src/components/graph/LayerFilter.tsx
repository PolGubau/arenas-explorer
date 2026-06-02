"use client";

import { useExplorerState } from "@/hooks/useExplorerState";
import {
  ALL_DIMENSIONS,
  DIMENSION_COLORS,
  DIMENSION_LABELS,
  HIDEABLE_RELATIONS,
  RELATION_LABELS,
} from "@/lib/constants";
import { Eye, EyeOff } from "@/lib/icons";
import type { Dimension, Relation } from "@/types/graph";

export function LayerFilter() {
  const {
    activeLayers,
    toggleLayer,
    hiddenRelations,
    toggleRelation,
    colorByCommunity,
    toggleColorByCommunity,
  } = useExplorerState();

  return (
    <div className="scrollbar-hide flex flex-nowrap items-center gap-1.5 overflow-x-auto xl:flex-wrap">
      {ALL_DIMENSIONS.map((d) => (
        <LayerChip
          key={d}
          dimension={d}
          active={activeLayers.has(d)}
          onClick={() => toggleLayer(d)}
        />
      ))}
      <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
      {HIDEABLE_RELATIONS.map((rel) => (
        <RelationChip
          key={rel}
          relation={rel}
          visible={!hiddenRelations.has(rel)}
          onClick={() => toggleRelation(rel)}
        />
      ))}
      <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
      <button
        type="button"
        onClick={toggleColorByCommunity}
        aria-pressed={colorByCommunity}
        title={colorByCommunity ? "Colorear por dimensión" : "Colorear por comunidad"}
        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${colorByCommunity
          ? "border-border-strong bg-[var(--color-bg-overlay)] text-fg"
          : "border-border bg-transparent text-fg-muted hover:text-fg"
          }`}
      >
        <span
          aria-hidden
          className="flex gap-0.5"
        >
          {["#E74C3C", "#3498DB", "#2ECC71", "#F1C40F"].map((c) => (
            <span
              key={c}
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: c, opacity: colorByCommunity ? 1 : 0.45 }}
            />
          ))}
        </span>
        <span>Comunidades</span>
      </button>
    </div>
  );
}

function RelationChip({
  relation,
  visible,
  onClick,
}: {
  relation: Relation;
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={visible}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${visible
        ? "border-border-strong bg-[var(--color-bg-overlay)] text-fg"
        : "border-border bg-transparent text-fg-muted hover:text-fg"
        }`}
      title={`${visible ? "Ocultar" : "Mostrar"} aristas «${RELATION_LABELS[relation]}»`}
    >
      {visible ? <Eye size={12} /> : <EyeOff size={12} />}
      <span>{RELATION_LABELS[relation]}</span>
    </button>
  );
}

function LayerChip({
  dimension,
  active,
  onClick,
}: {
  dimension: Dimension;
  active: boolean;
  onClick: () => void;
}) {
  const color = DIMENSION_COLORS[dimension];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${active
        ? "border-border-strong bg-[var(--color-bg-overlay)] text-fg"
        : "border-border bg-transparent text-fg-subtle hover:text-fg-muted"
        }`}
    >
      <span
        aria-hidden
        className="h-2.5 w-2.5 rounded-full transition-opacity"
        style={{ backgroundColor: color, opacity: active ? 1 : 0.35 }}
      />
      <span className="capitalize">{DIMENSION_LABELS[dimension]}</span>
    </button>
  );
}
