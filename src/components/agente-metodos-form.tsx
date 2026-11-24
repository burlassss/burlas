"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Smartphone, Save } from "lucide-react";
import { useToast } from "@/components/toast";
import type { AgenteOperadora } from "@/lib/db/types";

const inputClass = "mt-1 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-ink outline-none focus:border-forest";
export function AgenteMetodosForm({ operadoraInicial, mpesaInicial, emolaInicial }: { operadoraInicial: AgenteOperadora; mpesaInicial?: string | null; emolaInicial?: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [operadora, setOperadora] = React.useState<AgenteOperadora>(operadoraInicial);
  const [mpesa, setMpesa] = React.useState(mpesaInicial ?? "");
  const [emola, setEmola] = React.useState(emolaInicial ?? "");
  const [busy, setBusy] = React.useState(false);
  const usaMpesa = operadora === "mpesa" || operadora === "ambas";
  const usaEmola = operadora === "emola" || operadora === "ambas";

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const resp = await fetch("/api/agente/metodos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operadora, telefone_mpesa: mpesa, telefone_emola: emola }) });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.erro ?? "Não foi possível guardar os métodos.");
      toast("sucesso", "Métodos de pagamento atualizados", "Os clientes verão o número correspondente ao método escolhido.");
      router.refresh();
    } catch (e) {
      toast("erro", "Falha ao guardar", e instanceof Error ? e.message : "Tenta novamente.");
    } finally { setBusy(false); }
  }

  return <section className="rounded-3xl border border-black/5 bg-surface p-5 shadow-sm sm:p-6">
    <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-soft text-forest"><Smartphone className="h-5 w-5" /></span><div><h2 className="font-extrabold text-ink">Métodos de recebimento</h2><p className="text-xs font-medium text-ink/55">Os clientes recebem os números definidos para o método que escolherem.</p></div></div>
    <form onSubmit={guardar} className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-extrabold text-ink/65 sm:col-span-2">Métodos que operas<select className={inputClass} value={operadora} onChange={(e) => setOperadora(e.target.value as AgenteOperadora)}><option value="mpesa">M-Pesa</option><option value="emola">e-Mola</option><option value="ambas">M-Pesa e e-Mola</option></select></label>
      {usaMpesa && <label className="text-xs font-extrabold text-ink/65">Número da carteira M-Pesa<input className={inputClass} type="tel" inputMode="tel" autoComplete="tel" placeholder="+258 84… ou +258 85…" value={mpesa} onChange={(e) => setMpesa(e.target.value)} required /></label>}
      {usaEmola && <label className="text-xs font-extrabold text-ink/65">Número da carteira e-Mola<input className={inputClass} type="tel" inputMode="tel" autoComplete="tel" placeholder="+258 86… ou +258 87…" value={emola} onChange={(e) => setEmola(e.target.value)} required /></label>}
      <p className="text-[0.7rem] font-medium leading-relaxed text-ink/50 sm:col-span-2">Confirma que cada número pertence à carteira indicada. Os clientes verão apenas o número correspondente ao método escolhido. Métodos sem número válido não recebem pedidos.</p>
      <button type="submit" disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-forest px-4 text-sm font-extrabold text-white hover:bg-moss disabled:opacity-50 sm:col-span-2 sm:justify-self-end"><Save className="h-4 w-4" />{busy ? "A guardar…" : "Guardar métodos"}</button>
    </form>
  </section>;
}
