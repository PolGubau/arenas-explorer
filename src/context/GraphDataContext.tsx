"use client";

import type { CommunitySummary, ImagesIndex } from "@/types/graph";
import type Graph from "graphology";
import { createContext, useContext } from "react";

interface GraphDataValue {
  graph: Graph;
  imagesIndex: ImagesIndex;
  communities: CommunitySummary[];
}

const Ctx = createContext<GraphDataValue | null>(null);

export function GraphDataProvider({
  graph,
  imagesIndex,
  communities,
  children,
}: {
  graph: Graph;
  imagesIndex: ImagesIndex;
  communities: CommunitySummary[];
  children: React.ReactNode;
}) {
  return (
    <Ctx.Provider value={{ graph, imagesIndex, communities }}>
      {children}
    </Ctx.Provider>
  );
}

export function useGraphContext(): GraphDataValue {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error("useGraphContext must be used inside GraphDataProvider");
  }
  return value;
}
