import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fondo Areñas · Explorador semántico",
  description:
    "Explorador interactivo del grafo multidimensional del Fondo Fotográfico Areñas (1909–1935): fotografías, años, vestimenta y palabras HTR.",
  authors: [{ name: "Pol Gubau", url: "https://polgubau.com" }],
  openGraph: {
    title: "Fondo Areñas · Explorador semántico",
    description:
      "TFM en humanidades digitales — exploración interactiva del Fondo Fotográfico Areñas.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </head>
      <body className="overflow-hidden">{children}</body>
    </html>
  );
}
