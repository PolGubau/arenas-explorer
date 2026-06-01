"use client";

import { useGraphStore } from "@/store/graphStore";
import { DIMENSION_COLORS } from "@/lib/constants";
import type { Dimension } from "@/types/graph";

interface ChipProps {
  id: string;
  label: string;
  dimension: Dimension;
  icon?: React.ReactNode;
}

export function Chip({ id, label, dimension, icon }: ChipProps) {
  const setSelected = useGraphStore((s) => s.setSelected);
  const color = DIMENSION_COLORS[dimension];

  return (
    <button
      type="button"
      onClick={() => setSelected(id)}
      className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2.5 py-1 text-xs text-[var(--color-fg-muted)] transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-overlay)] hover:text-[var(--color-fg)]"
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {icon && (
        <span className="text-[var(--color-fg-subtle)] group-hover:text-[var(--color-fg-muted)]">
          {icon}
        </span>
      )}
      <span className="truncate max-w-[160px]">{label}</span>
    </button>
  );
}
