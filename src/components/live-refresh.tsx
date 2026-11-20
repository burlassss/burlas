"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Mantém a área do cliente atualizada sem refresh manual.
 *  · Supabase configurado → subscreve broadcast `update` no canal
 *    `user-updates:<userId>` (ping emitido pelo servidor a cada mudança)
 *    + safety-net de 30s.
 *  · Modo demo → polling de 8s (só com o separador visível).
 */
export function LiveRefresh({ userId, supabase }: { userId: string; supabase: boolean }) {
  const router = useRouter();
  const ultimoRefresh = React.useRef(0);

  React.useEffect(() => {
    const atualizar = () => {
      const agora = Date.now();
      if (agora - ultimoRefresh.current < 800) return; // debounce
      ultimoRefresh.current = agora;
      router.refresh();
    };
    const visivel = () => document.visibilityState === "visible";

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let cliente: SupabaseClient | null = null;
    let canal: ReturnType<SupabaseClient["channel"]> | null = null;
    let poll: number | undefined;

    if (supabase && url && anon) {
      cliente = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      canal = cliente.channel(`user-updates:${userId}`, { config: { private: false } });
      canal.on("broadcast", { event: "update" }, () => atualizar());
      canal.subscribe();
      poll = window.setInterval(() => { if (visivel()) router.refresh(); }, 30_000);
    } else {
      poll = window.setInterval(() => { if (visivel()) router.refresh(); }, 8_000);
    }

    return () => {
      if (poll) window.clearInterval(poll);
      if (cliente && canal) void cliente.removeChannel(canal);
    };
  }, [userId, supabase, router]);

  return null;
}
