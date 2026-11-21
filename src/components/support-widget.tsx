"use client";

import React from "react";
import { Headset, MessageCircle } from "lucide-react";
import { SlimeAssistant } from "@/components/slime/slime-assistant";

/** Botão de suporte discreto, sem mascote flutuante. */
export function SupportWidget() {
  const [aberto, setAberto] = React.useState(false);
  return <>
    <button type="button" onClick={() => setAberto(true)} aria-label="Abrir suporte" className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-forest px-5 text-sm font-extrabold text-white shadow-xl transition hover:bg-moss focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest sm:bottom-6 sm:right-6">
      <Headset className="h-5 w-5" /> <span>Suporte</span><MessageCircle className="h-4 w-4 opacity-70" />
    </button>
    <SlimeAssistant aberto={aberto} onFechar={() => setAberto(false)} />
  </>;
}
