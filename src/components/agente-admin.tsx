"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff, PauseCircle, Loader2, BadgePercent, Star } from "lucide-react";
import { Modal, Input, Label } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

export function AgenteAcoes({ id, nome, estado }: { id: string; nome: string; estado: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [comissaoAberto, setComissaoAberto] = React.useState(false);
  const [comissao, setComissao] = React.useState("");

  async function mudar(novo: string) {
    setBusy(novo);
    try {
      const resp = await fetch(`/api/admin/agentes/${id}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: novo }),
      });
      const data = await resp.json();
      if (resp.ok) {
        toast("sucesso", `Agente ${novo === "ativo" ? "aprovado/reativado" : novo}`);
        router.refresh();
      } else toast("erro", "Falha", data.erro);
    } finally {
      setBusy(null);
    }
  }

  async function salvarComissao(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(comissao.replace(",", "."));
    if (!Number.isFinite(v) || v < 0.1 || v > 10) {
      toast("erro", "Comissão inválida", "Entre 0.1% e 10%.");
      return;
    }
    setBusy("comissao");
    try {
      const resp = await fetch(`/api/admin/agentes/${id}/comissao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pct: v }),
      });
      const data = await resp.json();
      if (resp.ok) {
        toast("sucesso", "Comissão atualizada", `${nome}: ${v}%`);
        setComissaoAberto(false);
        router.refresh();
      } else toast("erro", "Falha", data.erro);
    } finally {
      setBusy(null);
    }
  }

  const botoes = estado === "pendente"
    ? [
        { acao: "ativo", label: "Aprovar", icon: ShieldCheck, estilo: "bg-lime text-pine" },
        { acao: "inativo", label: "Recusar", icon: ShieldOff, estilo: "bg-red-100 text-red-700" },
      ]
    : estado === "ativo"
      ? [
          { acao: "suspenso", label: "Suspender", icon: PauseCircle, estilo: "bg-amber-100 text-amber-800" },
          { acao: "inativo", label: "Desativar", icon: ShieldOff, estilo: "bg-red-100 text-red-700" },
        ]
      : [{ acao: "ativo", label: "Reativar", icon: ShieldCheck, estilo: "bg-lime text-pine" }];

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {botoes.map((b) => (
        <button key={b.acao} onClick={() => mudar(b.acao)} disabled={!!busy} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.68rem] font-extrabold transition-opacity hover:opacity-80 disabled:opacity-50", b.estilo)}>
          {busy === b.acao ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <b.icon className="h-3.5 w-3.5" />}
          {b.label}
        </button>
      ))}
      <button onClick={() => setComissaoAberto(true)} className="flex items-center gap-1.5 rounded-lg bg-sand px-3 py-1.5 text-[0.68rem] font-extrabold text-ink/75 hover:bg-mist">
        <BadgePercent className="h-3.5 w-3.5" /> Comissão
      </button>

      <Modal open={comissaoAberto} onClose={() => setComissaoAberto(false)} title={`Comissão — ${nome}`}>
        <form onSubmit={salvarComissao} className="flex flex-col gap-3">
          <Label htmlFor="comissao" hint="0.1–10%">Nova comissão por operação</Label>
          <Input id="comissao" inputMode="decimal" placeholder="ex.: 1.5" value={comissao} onChange={(e) => setComissao(e.target.value)} autoFocus required />
          <button type="submit" disabled={busy === "comissao"} className="rounded-2xl bg-forest py-3 text-sm font-extrabold text-lime hover:bg-moss disabled:opacity-60">{busy === "comissao" ? "A guardar…" : "Guardar"}</button>
        </form>
      </Modal>
    </div>
  );
}
