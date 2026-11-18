"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";
import { Label, Input, Button } from "@/components/ui";
import { useToast } from "@/components/toast";
import type { Fee } from "@/lib/db/types";

const FEE_LABEL: Record<string, string> = {
  deposito_mpesa_pct: "Depósito M-Pesa (comissão)",
  deposito_emola_pct: "Depósito e-Mola (comissão)",
  deposito_usdt_pct: "Depósito USDT (comissão)",
  levantamento_mpesa_usd: "Levantamento M-Pesa (taxa fixa)",
  levantamento_emola_usd: "Levantamento e-Mola (taxa fixa)",
  levantamento_usdt_usd: "Levantamento USDT (taxa fixa)",
  comissao_agente_pct: "Comissão de agente (operações)",
  cambio_margem_pct: "Margem de câmbio",
};

export function FeeForm({ fee }: { fee: Fee }) {
  const router = useRouter();
  const { toast } = useToast();
  const [valor, setValor] = React.useState(String(fee.valor));
  const [ativo, setAtivo] = React.useState(fee.ativo);
  const [busy, setBusy] = React.useState(false);

  async function guardar() {
    const v = Number(valor.replace(",", "."));
    if (!Number.isFinite(v) || v < 0) {
      toast("erro", "Valor inválido");
      return;
    }
    setBusy(true);
    try {
      const resp = await fetch("/api/admin/fees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chave: fee.chave, valor: v, moeda: fee.moeda, ativo }),
      });
      const data = await resp.json();
      if (resp.ok) {
        toast("sucesso", "Taxa atualizada", `${FEE_LABEL[fee.chave] ?? fee.chave} → ${v}${fee.moeda === "USD" ? " USD" : fee.chave.endsWith("_pct") ? "%" : ""}`);
        router.refresh();
      } else toast("erro", "Falha", data.erro);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-12 items-center gap-2 px-5 py-3.5 transition-colors hover:bg-sand/30">
      <div className="col-span-12 sm:col-span-5">
        <p className="text-sm font-extrabold text-ink">{FEE_LABEL[fee.chave] ?? fee.chave}</p>
        <p className="font-mono text-[0.62rem] font-semibold text-ink/45">{fee.chave} · {fee.moeda}</p>
      </div>
      <div className="col-span-5 sm:col-span-3">
        <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className="h-11 text-sm tabular-nums" aria-label="Valor" />
      </div>
      <div className="col-span-4 sm:col-span-2">
        <button onClick={() => setAtivo(!ativo)} className={`flex h-11 w-full items-center justify-center rounded-2xl border-2 text-[0.65rem] font-extrabold uppercase tracking-wider transition-colors ${ativo ? "border-forest bg-lime-soft text-forest" : "border-mist text-ink/45"}`} aria-pressed={ativo}>
          {ativo ? "Ativa" : "Inativa"}
        </button>
      </div>
      <div className="col-span-3 sm:col-span-2 text-right">
        <button onClick={guardar} disabled={busy} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-forest text-lime transition-transform hover:scale-105 disabled:opacity-50" aria-label="Guardar taxa">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

export function TaxaCambioForm({ valorAtual, margemAtual, efetivoEm }: { valorAtual: number; margemAtual: number; efetivoEm: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [usdMzn, setUsdMzn] = React.useState(String(valorAtual));
  const [margem, setMargem] = React.useState(String(margemAtual));
  const [busy, setBusy] = React.useState(false);

  async function publicar() {
    const v = Number(usdMzn.replace(",", "."));
    const m = Number(margem.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0 || !Number.isFinite(m) || m < 0) {
      toast("erro", "Valores inválidos");
      return;
    }
    setBusy(true);
    try {
      const resp = await fetch("/api/admin/taxas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor: v, margem: m }),
      });
      const data = await resp.json();
      if (resp.ok) {
        toast("sucesso", "Cotação publicada", `1 USD = ${v.toLocaleString("pt-MZ")} MT (margem ${m}%)`);
        router.refresh();
      } else toast("erro", "Falha", data.erro);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void publicar(); }} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40">
          <Label htmlFor="nova-taxa" hint="MT por 1 USD">Taxa base USD/MZN</Label>
          <Input id="nova-taxa" inputMode="decimal" value={usdMzn} onChange={(e) => setUsdMzn(e.target.value)} className="h-12 text-lg font-extrabold tabular-nums" />
        </div>
        <div className="w-32">
          <Label htmlFor="margem" hint="%">Margem</Label>
          <Input id="margem" inputMode="decimal" value={margem} onChange={(e) => setMargem(e.target.value)} className="h-12 text-lg font-extrabold tabular-nums" />
        </div>
        <Button type="submit" loading={busy} size="lg">Publicar cotação</Button>
      </div>
      <p className="text-[0.68rem] font-semibold text-ink/50">Substitui 1 USD = {valorAtual.toLocaleString("pt-MZ", { minimumFractionDigits: 2 })} MT (margem {margemAtual}%, desde {new Date(efetivoEm).toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })}). Em vigor imediatamente — cotações antigas mantêm a taxa capturada.</p>
    </form>
  );
}
