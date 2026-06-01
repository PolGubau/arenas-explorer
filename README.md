# Explorador del Fondo Fotográfico Areñas

Visualización interactiva del grafo multidimensional construido a partir del
**Fondo Fotográfico Areñas (1909–1935)** para el TFM en humanidades digitales.

> 740 nodos · 4 120 aristas · ForceAtlas2 pre‑calculado · WebGL (Sigma.js)

## Qué muestra

El grafo conecta **564 fotografías históricas** con tres dimensiones extraídas
mediante visión por computador y HTR:

| Dimensión      | Fuente                          | Nodos              |
| -------------- | ------------------------------- | ------------------ |
| Año predicho   | clasificador de fechas          | 17 hubs temporales |
| Vestimenta     | detección automática de prendas | 32 prendas         |
| Palabras (HTR) | transcripción del manuscrito    | 127 palabras       |

## Stack

```
Next.js 16 · React 19 · TypeScript · Tailwind v4
Sigma.js 3 + @react-sigma/core + @sigma/node-image
Graphology · graphology‑gexf · graphology‑layout‑forceatlas2
Zustand · Framer Motion · lucide-react
```

## Pipeline

```
data/grafo.gexf                       (1.5 MB · GEXF 1.2draft)
        │
        ▼  scripts/parse-gexf.ts        (prebuild · 500 it. FA2)
public/data/graph.json                (posiciones x,y fijas)
public/data/images-index.json         (metadatos + url → thumb)
        ▼
src/hooks/useGraphData.ts             (Graphology + preload texturas)
src/components/graph/GraphCanvas.tsx  (Sigma · WebGL · cliente)
src/components/panel/DetailPanel.tsx  (panel contextual por dimensión)
```

Las posiciones FA2 se calculan **una sola vez** en `prebuild`; el cliente
nunca corre layout. Las texturas se sirven desde `public/images-thumb/`
(WebP ~600 px, q=78) — los originales (~2 GB) quedan fuera del repo.

## Desarrollo local

```bash
npm install
npm run optimize:images   # solo si tienes public/images-iaah/ con las originales
npm run dev               # arranca con prebuild que regenera graph.json
```

Abre [http://localhost:3000](http://localhost:3000).

### Scripts

| Script                    | Descripción                                                           |
| ------------------------- | --------------------------------------------------------------------- |
| `npm run dev`             | Servidor Next.js · regenera graph.json antes de arrancar              |
| `npm run build`           | Build de producción                                                   |
| `npm run start`           | Sirve el build                                                        |
| `npm run optimize:images` | Genera `public/images-thumb/*.webp` a partir de `public/images-iaah/` |

## Despliegue

El proyecto está pensado para Vercel: importa el repo en
[vercel.com/new](https://vercel.com/new), no requiere variables de entorno y
`prebuild` se ejecuta automáticamente.

## Créditos

Desarrollado por **[polgubau.com](https://polgubau.com)** como módulo de
visualización del TFM. Datos y modelos del Fondo Areñas — Arxiu en Línia de
la Generalitat de Catalunya.

## Licencia

El código fuente es de **visualización libre** pero requiere atribución. Cualquier uso, adaptación o redistribución debe incluir crédito visible al autor original:

> "Based on work by Pol Gubau Amores — [polgubau.com](https://polgubau.com)"

Consulta el archivo [LICENSE](./LICENSE) para los términos completos.

⚠️ **Las fotografías están protegidas.** Las imágenes del Fondo Areñas pertenecen al **Arxiu en Línia de la Generalitat de Catalunya** y **no se pueden descargar, copiar, redistribuir ni reutilizar** sin autorización expresa del titular de los derechos. La licencia de este repositorio cubre **únicamente** el código fuente.
