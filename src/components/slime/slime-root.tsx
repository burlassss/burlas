"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SlimeCompanion } from "./slime-companion";

/**
 * Raiz da mascote: monta-a uma única vez.
 * - Não aparece em áreas restritas (/admin, /agente) nem na impressão.
 * - Respeita a preferência local de ocultar ("Ocultar a Mozinha").
 */
export function SlimeRoot() {
  const pathname = usePathname();
  const [montado, setMontado] = React.useState(false);
  const [oculta, setOculta] = React.useState(true);

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => {
      let esconder = false;
      try {
        esconder = window.localStorage.getItem("mozout:slime:hidden") === "1";
      } catch {
        esconder = false;
      }
      setOculta(esconder);
      setMontado(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!montado || oculta) return null;
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/agente")) return null;
  return <SlimeCompanion />;
}
