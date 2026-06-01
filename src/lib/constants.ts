import type { Dimension, Relation } from "@/types/graph";

export const DIMENSION_COLORS: Record<Dimension, string> = {
  imagen: "#4A90D9",
  año: "#E8604B",
  vestimenta: "#9B59B6",
  transcripcion: "#27AE60",
};

export const DIMENSION_LABELS: Record<Dimension, string> = {
  imagen: "Fotografías",
  año: "Años",
  vestimenta: "Vestimenta",
  transcripcion: "Palabras HTR",
};

export const RELATION_COLORS: Record<Relation, string> = {
  lleva_puesto: "#9B59B6",
  pertenece_a_año: "#E8604B",
  contiene_palabra: "#27AE60",
  mismo_año: "#71717a",
};

export const ALL_DIMENSIONS: Dimension[] = [
  "imagen",
  "año",
  "vestimenta",
  "transcripcion",
];

// Proporcional al grado. Mínimo 6, máximo ~30.
export function nodeSizeFromDegree(degree: number): number {
  return 6 + Math.log1p(degree) * 4;
}
