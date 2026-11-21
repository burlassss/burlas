"use client";

import { usePathname } from "next/navigation";
import { SupportWidget } from "@/components/support-widget";

/** Atalho de suporte comum; a mascote flutuante foi desativada. */
export function SlimeRoot() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/agente")) return null;
  return <SupportWidget />;
}
