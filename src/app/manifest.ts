import type { MetadataRoute } from "next";

/** Manifest PWA — instalação limpa ("enquadrada") no ecrã inicial do telemóvel. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MOZOUT-USD — Carteira digital em dólares",
    short_name: "MOZOUT-USD",
    description: "Carteira digital em dólares e cartões virtuais internacionais para Moçambique.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#163c2b",
    theme_color: "#163c2b",
    lang: "pt-MZ",
    categories: ["finance", "shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
