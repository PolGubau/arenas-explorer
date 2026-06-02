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

/**
 * Mapa de traducción de prendas: ID inglés (clave en el grafo) → etiqueta española.
 * Se usa en el sidebar y en el tooltip del grafo para mostrar el nombre en español.
 */
export const CLOTHING_LABELS: Record<string, string> = {
	"baroque coat":       "Abrigo barroco",
	"bow tie":            "Pajarita",
	"cassock":            "Sotana",
	"cloak":              "Capa",
	"crinoline dress":    "Vestido de crinolina",
	"evening gown":       "Vestido de noche",
	"fan":                "Abanico",
	"flamenco dress":     "Traje de flamenca",
	"folk costume":       "Traje regional",
	"gloves":             "Guantes",
	"handbag":            "Bolso",
	"historical costume": "Traje histórico",
	"kimono":             "Kimono",
	"laurel crown":       "Corona de laurel",
	"mantilla":           "Mantilla",
	"medieval costume":   "Traje medieval",
	"military uniform":   "Uniforme militar",
	"morning coat":       "Chaqué",
	"naval uniform":      "Uniforme naval",
	"nun habit":          "Hábito de monja",
	"overcoat":           "Gabán",
	"renaissance dress":  "Vestido renacentista",
	"sailor suit":        "Traje de marinero",
	"shawl":              "Chal",
	"tailcoat":           "Frac",
	"three-piece suit":   "Traje de tres piezas",
	"top hat":            "Chistera",
	"traditional costume":"Traje tradicional",
	"turban":             "Turbante",
	"tuxedo":             "Esmoquin",
	"veil":               "Velo",
	"walking cane":       "Bastón",
};

/** Devuelve la etiqueta española de una prenda, o el ID original si no hay traducción. */
export function getClothingLabel(id: string): string {
	return CLOTHING_LABELS[id] ?? id;
}

// Jerarquía visual por importancia (grado). Bases bajas + pendientes altas:
// las hojas (la mayoría de imágenes y todas las transcripciones) ocupan poco
// espacio, los hubs (años con muchas fotos, vestimentas muy frecuentes) crecen
// notablemente para actuar como anclas visibles. El spread leaf→hub pasa de
// ~1.7× a ~5×, así la importancia se *ve*. FA2 (adjustSizes) + noverlap
// reaccionan a estos radios → hojas se compactan, hubs ganan halo de aire.
export function nodeSize(dimension: Dimension, degree: number): number {
	const d = Math.max(0, degree);
	switch (dimension) {
		case "imagen":
			return 3 + Math.log1p(d) * 3.0;
		case "año":
			return 4 + Math.log1p(d) * 3.5;
		case "vestimenta":
			return 2 + Math.log1p(d) * 2.5;
		case "transcripcion":
			return 2 + Math.log1p(d) * 1.5;
	}
}
