import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import { SlimeRoot } from "@/components/slime/slime-root";

export const metadata: Metadata = {
  title: {
    default: "MOZOUT-USD — A tua carteira em dólares, feita para Moçambique",
    template: "%s · MOZOUT-USD",
  },
  description:
    "Cria uma conta, recebe um cartão virtual internacional e financia-o com M-Pesa, e-Mola ou USDT (TRC20). Dollars na tua mão, em Moçambique.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MOZOUT-USD",
  },
};

export const viewport: Viewport = {
  themeColor: "#163c2b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-MZ">
      <body className="min-h-dvh bg-cream text-ink antialiased">
        <ToastProvider>{children}<SlimeRoot /></ToastProvider>
      </body>
    </html>
  );
}
