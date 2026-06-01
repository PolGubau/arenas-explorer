"use client";

import { createContext, useContext } from "react";
import type Graph from "graphology";
import type { ImagesIndex } from "@/types/graph";

interface GraphDataValue {
  graph: Graph;
  imagesIndex: ImagesIndex;
}

const Ctx = createContext<GraphDataValue | null>(null);

export function GraphDataProvider({
  graph,
  imagesIndex,
  children,
}: {
  graph: Graph;
  imagesIndex: ImagesIndex;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={{ graph, imagesIndex }}>{children}</Ctx.Provider>;
}

export function useGraphContext(): GraphDataValue {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error("useGraphContext must be used inside GraphDataProvider");
  }
  return value;
}
