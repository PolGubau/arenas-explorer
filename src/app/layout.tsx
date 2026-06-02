import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Self-hosted by Next at build time — no render-blocking external stylesheet,
// no third-party privacy leak, and `display: swap` keeps LCP unblocked.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

const TITLE = "Fondo Areñas · Explorador semántico";
const DESCRIPTION =
  "Explorador interactivo del grafo multidimensional del Fondo Fotográfico Areñas (1909–1935): fotografías, años, vestimenta y palabras HTR.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Explorador Fondo Areñas",
  authors: [{ name: "Pol Gubau", url: "https://polgubau.com" }],
  creator: "Pol Gubau Amores",
  keywords: [
    "Fondo Areñas",
    "humanidades digitales",
    "TFM",
    "grafo",
    "ForceAtlas2",
    "Sigma.js",
    "fotografía histórica",
    "HTR",
  ],
  openGraph: {
    title: TITLE,
    description:
      "TFM en humanidades digitales — exploración interactiva del Fondo Fotográfico Areñas.",
    url: SITE_URL,
    siteName: "Fondo Areñas",
    type: "website",
    locale: "es_ES",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Explorador semántico del Fondo Fotográfico Areñas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`dark ${inter.variable}`}>
      <head>
        {/*
         * Kick off the two largest critical-path JSON fetches before the React
         * bundle has even parsed. By the time `useGraphData` runs its
         * `fetch()` calls, the responses are usually already cached, shaving
         * ~150ms off TTI on cold loads.
         */}
        <link
          rel="preload"
          href="/data/graph.json"
          as="fetch"
          type="application/json"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/data/images-index.json"
          as="fetch"
          type="application/json"
          crossOrigin="anonymous"
        />
      </head>
      <body className="overflow-hidden">{children}</body>
    </html>
  );
}
