"use client";

import { useGraphContext } from "@/context/GraphDataContext";
import { useExplorerState } from "@/hooks/useExplorerState";
import { ImageIcon } from "@/lib/icons";

interface RelatedThumbProps {
  id: string;
  size?: number;
}

export function RelatedThumb({ id, size }: RelatedThumbProps) {
  const { setSelected } = useExplorerState();
  const { graph, imagesIndex } = useGraphContext();

  if (!graph.hasNode(id)) return null;
  const meta = imagesIndex[id];
  const year = graph.getNodeAttribute(id, "year") as number | undefined;

  // When `size` is omitted the thumb fills its grid cell as a square.
  const style = size ? { width: size, height: size } : undefined;
  const className = size
    ? "group relative overflow-hidden rounded-md border border-border -elevated transition-all hover:border-border-strong hover:ring-1 hover:ring-[var(--color-accent)]/40"
    : "group relative aspect-square w-full overflow-hidden rounded-md border border-border -elevated transition-all hover:border-border-strong hover:ring-1 hover:ring-[var(--color-accent)]/40";

  return (
    <button
      type="button"
      onClick={() => setSelected(id)}
      title={meta?.caption || id}
      style={style}
      className={className}
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
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-fg-subtle">
          <ImageIcon size={16} />
          {year && (
            <span className="text-[9px] font-medium tabular-nums">{year}</span>
          )}
        </div>
      )}
    </button>
  );
}
