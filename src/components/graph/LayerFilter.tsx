"use client";

import { useGraphStore } from "@/store/graphStore";
import {
  ALL_DIMENSIONS,
  DIMENSION_COLORS,
  DIMENSION_LABELS,
} from "@/lib/constants";
import { Eye, EyeOff } from "@/lib/icons";
import type { Dimension } from "@/types/graph";

export function LayerFilter() {
  const activeLayers = useGraphStore((s) => s.activeLayers);
  const toggleLayer = useGraphStore((s) => s.toggleLayer);
  const showSameYear = useGraphStore((s) => s.showSameYear);
  const toggleSameYear = useGraphStore((s) => s.toggleSameYear);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ALL_DIMENSIONS.map((d) => (
        <LayerChip
          key={d}
          dimension={d}
          active={activeLayers.has(d)}
          onClick={() => toggleLayer(d)}
        />
      ))}
      <span className="mx-1 hidden h-5 w-px bg-[var(--color-border)] sm:block" />
      <button
        type="button"
        onClick={toggleSameYear}
        aria-pressed={showSameYear}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
          showSameYear
            ? "border-[var(--color-border-strong)] bg-[var(--color-bg-overlay)] text-[var(--color-fg)]"
            : "border-[var(--color-border)] bg-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        }`}
        title="Mostrar aristas «mismo año» (1596 aristas — ruido visual)"
      >
        {showSameYear ? <Eye size={12} /> : <EyeOff size={12} />}
        <span>Mismo año</span>
      </button>
    </div>
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
        active
          ? "border-[var(--color-border-strong)] bg-[var(--color-bg-overlay)] text-[var(--color-fg)]"
          : "border-[var(--color-border)] bg-transparent text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-muted)]"
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
