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

// Jerarquía visual por dimensión: imagen = contenido primario, año = anclas
// temporales, vestimenta/transcripción = tags secundarios. Curvas sub-lineales
// con techos apretados evitan que los hubs (años con cientos de fotos, palabras
// muy frecuentes) dominen el canvas y compliquen el noverlap del build.
export function nodeSize(dimension: Dimension, degree: number): number {
  const d = Math.max(0, degree);
  switch (dimension) {
    case "imagen":
      return 7 + Math.log1p(d) * 2.5;
    case "año":
      return 8 + Math.log1p(d) * 1.6;
    case "vestimenta":
      return 4 + Math.log1p(d) * 1.0;
    case "transcripcion":
      return 3 + Math.log1p(d) * 0.8;
  }
}
