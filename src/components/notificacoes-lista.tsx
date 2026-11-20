"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckCheck } from "lucide-react";
import { MOVIMENTO_ICONES } from "./notificacao-icones";
import { TempoRelativo } from "@/components/tempo-relativo";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/db/types";

export function NotificacoesLista({ itens }: { itens: Notification[] }) {
  const router = useRouter();
  const [pendentes, setPendentes] = React.useState<Set<string>>(new Set(itens.filter((n) => n.estado !== "lida").map((n) => n.id)));

  async function marcar(id: string) {
    setPendentes((s) => { const n = new Set(s); n.delete(id); return n; });
    await fetch(`/api/notificacoes/${id}/lida`, { method: "POST" });
    router.refresh();
  }
  async function marcarTodas() {
    setPendentes(new Set());
    await fetch("/api/notificacoes/marcar-lidas", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-ink/50">{pendentes.size} por ler</p>
        <button onClick={marcarTodas} disabled={pendentes.size === 0} className="flex items-center gap-1.5 rounded-full border border-mist px-4 py-2 text-xs font-extrabold text-forest transition-all hover:border-forest disabled:opacity-40">
          <CheckCheck className="h-4 w-4" /> Marcar todas como lidas
        </button>
      </div>
      <ul className="divide-y divide-black/5 overflow-hidden rounded-3xl border border-black/5 bg-surface">
        {itens.map((n) => {
          const porLer = pendentes.has(n.id);
          const Icone = MOVIMENTO_ICONES[n.tipo] ?? MOVIMENTO_ICONES.default;
          return (
            <li key={n.id}>
              <button onClick={() => porLer && marcar(n.id)} className={cn("flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-sand/40", porLer && "bg-lime-soft/30")}>
                <span className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", porLer ? "bg-forest text-lime" : "bg-sand text-forest")}>
                  <Icone className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-extrabold text-ink">{n.titulo}</span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {n.canal === "sms" && <span className="rounded bg-sand px-1.5 py-0.5 text-[0.55rem] font-extrabold uppercase text-ink/50">SMS</span>}
                      {porLer && <span className="h-2 w-2 rounded-full bg-lime-strong" aria-label="Por ler" />}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs font-medium leading-snug text-ink/60">{n.corpo}</span>
                  <span className="mt-1 block text-[0.62rem] font-bold uppercase tracking-wide text-ink/40"><TempoRelativo iso={n.criado_em} /></span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Marca tudo como lido automaticamente ao abrir a página? Não — apenas no clique do utilizador. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
