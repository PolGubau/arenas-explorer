"use client";

import { useGraphContext } from "@/context/GraphDataContext";
import { useExplorerState } from "@/hooks/useExplorerState";
import { ImageIcon } from "@/lib/icons";

interface RelatedThumbProps {
  id: string;
  size?: number;
}

export function RelatedThumb({ id, size = 64 }: RelatedThumbProps) {
  const { setSelected } = useExplorerState();
  const { graph, imagesIndex } = useGraphContext();

  if (!graph.hasNode(id)) return null;
  const meta = imagesIndex[id];
  const year = graph.getNodeAttribute(id, "year") as number | undefined;

  return (
    <button
      type="button"
      onClick={() => setSelected(id)}
      title={meta?.caption || id}
      style={{ width: size, height: size }}
      className="group relative overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] transition-all hover:border-[var(--color-border-strong)] hover:ring-1 hover:ring-[var(--color-accent)]/40"
    >
      {meta?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.url}
          alt={meta.caption || id}
          loading="lazy"
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[var(--color-fg-subtle)]">
          <ImageIcon size={16} />
          {year && (
            <span className="text-[9px] font-medium tabular-nums">{year}</span>
          )}
        </div>
      )}
    </button>
  );
}
