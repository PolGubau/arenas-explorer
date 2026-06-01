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

// Colores en estado idle (sin hover). Vestimenta es la relación más densa del
// grafo y satura el canvas en rosa; bajamos su alpha para mantener la lectura
// global. Al hacer hover se recupera el color sólido vía RELATION_COLORS.
// Alpha en hex: 0.07≈12, 0.20≈33, 0.18≈2E, 0.15≈26
// Sigma solo parsea hex; rgba() se ignora y cae a blanco.
export const RELATION_IDLE_COLORS: Record<Relation, string> = {
	lleva_puesto: "#43344a",
	pertenece_a_año: "#6d3c35",
	contiene_palabra: "#28533a",
	mismo_año: "#202b2d",
};

// Paleta categórica para 12 comunidades. Colores saturados sobre fondo oscuro,
// suficientemente distintos entre sí para que los grupos sean reconocibles.
export const COMMUNITY_COLORS: string[] = [
	"#E74C3C", // 0 – rojo
	"#E67E22", // 1 – naranja
	"#F1C40F", // 2 – amarillo
	"#2ECC71", // 3 – verde
	"#1ABC9C", // 4 – teal
	"#3498DB", // 5 – azul
	"#9B59B6", // 6 – violeta
	"#E91E63", // 7 – rosa
	"#00BCD4", // 8 – cian
	"#8BC34A", // 9 – verde lima
	"#FF5722", // 10 – naranja intenso
	"#607D8B", // 11 – azul pizarra
];

export const ALL_DIMENSIONS: Dimension[] = [
	"imagen",
	"año",
	"vestimenta",
	"transcripcion",
];

export const RELATION_LABELS: Record<Relation, string> = {
	lleva_puesto: "Vestimenta",
	mismo_año: "Mismo año",
	pertenece_a_año: "Año",
	contiene_palabra: "Palabras",
};

// Relaciones expuestas como toggle de visibilidad en `LayerFilter`. Solo las
// densas (que saturan el canvas) merecen una palanca dedicada; las otras dos
// (pertenece_a_año, contiene_palabra) tienen pocas aristas y son útiles para
// la navegación, así que se mantienen siempre visibles.
export const HIDEABLE_RELATIONS: Relation[] = ["mismo_año", "lleva_puesto"];

// Por defecto ocultamos `mismo_año` (1 596 aristas foto↔foto, necesarias para
// el layout de ForceAtlas2 pero ruido visual en render). El resto se muestra.
export const DEFAULT_HIDDEN_RELATIONS: ReadonlySet<Relation> = new Set([
	"mismo_año",
]);

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
