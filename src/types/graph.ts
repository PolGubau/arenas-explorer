export type Dimension = "imagen" | "transcripcion" | "año" | "vestimenta";

export type Relation =
	| "lleva_puesto"
	| "mismo_año"
	| "pertenece_a_año"
	| "contiene_palabra";

export interface GraphNode {
	id: string;
	label: string;
	dimension: Dimension;
	community: number;
	degree: number;
	x: number;
	y: number;
	year?: number;
	confianza?: number;
	n_fotos?: number;
}

export interface GraphEdge {
	source: string;
	target: string;
	relation: Relation;
}

export interface CommunitySummary {
	id: number;
	label: string;
	x: number;
	y: number;
	size: number;
	topWords: string[];
	year?: number;
}

export interface GraphData {
	nodes: GraphNode[];
	edges: GraphEdge[];
	communities?: CommunitySummary[];
}

export interface ImageMeta {
	caption: string;
	url: string;
	year_csv: number;
	nom_fons: string;
	nom_arxiu: string;
	toponims: string;
	noms_propis: string;
}

export type ImagesIndex = Record<string, ImageMeta>;

// Rich bibliographic / conservation metadata kept as a sidecar JSON
// (public/data/photo-meta.json) so it doesn't bloat the GEXF or graph.json
// payload — only consulted when a photo node is inspected.
export interface PhotoMeta {
	archive?: string;
	format?: string;
	material?: string;
	author?: string;
	title?: string;
	description?: string;
	state?: string;
	damages?: string;
	manipulations?: string;
	observations?: string;
	lastControl?: string;
	camera?: string;
}

export type PhotoMetaIndex = Record<string, PhotoMeta>;
