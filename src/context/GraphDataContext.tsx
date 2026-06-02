"use client";

import type {
  CommunitySummary,
  ImagesIndex,
  PhotoMetaIndex,
} from "@/types/graph";
import type Graph from "graphology";
import { createContext, useContext, useMemo } from "react";

interface GraphDataValue {
  graph: Graph;
  imagesIndex: ImagesIndex;
  photoMeta: PhotoMetaIndex;
  communities: CommunitySummary[];
}

const Ctx = createContext<GraphDataValue | null>(null);

export function GraphDataProvider({
  graph,
  imagesIndex,
  photoMeta,
  communities,
  children,
}: {
  graph: Graph;
  imagesIndex: ImagesIndex;
  photoMeta: PhotoMetaIndex;
  communities: CommunitySummary[];
  children: React.ReactNode;
}) {
  // Stabilise the context value so consumers (DetailPanel, CommandPalette,
  // Header, etc.) don't re-render every time the parent's state changes.
  const value = useMemo<GraphDataValue>(
    () => ({ graph, imagesIndex, photoMeta, communities }),
    [graph, imagesIndex, photoMeta, communities],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGraphContext(): GraphDataValue {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error("useGraphContext must be used inside GraphDataProvider");
  }
  return value;
}
