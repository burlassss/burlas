"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, CheckCircle2, Loader2, Smartphone, Info, AlertCircle, HandCoins,
} from "lucide-react";
import { Button, Input, Label, FieldError, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn, telefoneValido } from "@/lib/utils";
import { formatMoeda } from "@/lib/money";
import { TempoRelativo } from "@/components/tempo-relativo";
import { ESTADO_LEVANTAMENTO, METODO_LABEL } from "@/lib/labels";
import type { LevantamentoEstado } from "@/lib/db/types";

interface CotacaoLev {
  taxaBase: number;
  taxaEfetiva: number;
  valorMznBrutoCents: number;
  taxaUsdCents: number;
  comissaoAgenteCents: number;
  valorLiquidoMznCents: number;
}
export interface LevantamentoResumo {
  id: string;
  referencia: string;
  metodo: string;
  valor_usd: number;
  valor_liquido_mzn: number | null;
  estado: LevantamentoEstado;
  destino: string;
  criado_em: string;
  codigo_tx: string | null;
}

export function LevantamentoFlow({ telefoneInicial, recentes }: { telefoneInicial: string; recentes: LevantamentoResumo[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [valorUsd, setValorUsd] = React.useState("50");
  const [metodo, setMetodo] = React.useState<"mpesa" | "emola">("mpesa");
  const [destino, setDestino] = React.useState(telefoneInicial);
  const [cotacao, setCotacao] = React.useState<CotacaoLev | null>(null);
  const [cotando, setCotando] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [sucesso, setSucesso] = React.useState<{ referencia: string; liquidoMzn: number | null } | null>(null);

  const valorNumero = Number(valorUsd.replace(",", ".")) || 0;
  const destinoOk = telefoneValido(destino.replace(/\s/g, ""));
  const cotacaoVisivel = valorNumero >= 5 ? cotacao : null;

  React.useEffect(() => {
    if (valorNumero < 5) return;
    const t = window.setTimeout(async () => {
      setCotando(true);
      try {
        const resp = await fetch(`/api/levantamentos/cotacao?metodo=${metodo}&usd=${valorNumero}`);
        if (resp.ok) setCotacao(await resp.json()); else setCotacao(null);
      } catch {
        setCotacao(null);
      } finally {
        setCotando(false);
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [valorNumero, metodo]);

  async function confirmar() {
    setErro(null);
    if (valorNumero < 5) return setErro("O mínimo são $5.00.");
    if (!destinoOk) return setErro("Número de destino inválido. Usa o formato +258…");
    setBusy(true);
    try {
      const resp = await fetch("/api/levantamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metodo, valorUsd: valorNumero, destino: destino.replace(/\s/g, "") }),
      });
      const data = await resp.json();
      if (!resp.ok) { setErro(data.erro); return; }
      setSucesso({ referencia: data.levantamento.referencia, liquidoMzn: data.levantamento.valor_liquido_mzn });
      toast("sucesso", "Levantamento solicitado", `Referência ${data.levantamento.referencia}`);
      router.refresh();
    } catch {
      setErro("Erro de ligação. Tenta novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmarRececao(id: string) {
    setBusy(true);
    try {
      const resp = await fetch(`/api/levantamentos/${id}/confirmar`, { method: "POST" });
      if (resp.ok) {
        toast("sucesso", "Receção confirmada", "Levantamento concluído. Obrigado!");
        router.refresh();
      } else {
        const data = await resp.json().catch(() => null);
        toast("erro", "Ainda não podes confirmar", data?.erro);
      }
    } finally {
      setBusy(false);
    }
  }

  if (sucesso) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-black/5 bg-surface px-6 py-12 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-lime-soft"><CheckCircle2 className="h-9 w-9 text-forest" strokeWidth={1.8} /></span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-forest">Pedido criado!</h1>
        <p className="mt-1.5 max-w-sm text-sm font-medium text-ink/60">
          Reservámos os fundos. Um agente verificado vai transferir
          {sucesso.liquidoMzn ? <> <strong>MT {sucesso.liquidoMzn.toLocaleString("pt-MZ", { minimumFractionDigits: 2 })}</strong></> : " o valor"} para o teu {METODO_LABEL[metodo]}. Reserva é válida por 20 minutos.
        </p>
        <p className="mt-3 rounded-full bg-sand px-4 py-1.5 font-mono text-xs font-bold text-ink/60">Ref. {sucesso.referencia}</p>
        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <button onClick={() => { setSucesso(null); router.refresh(); }} className="flex h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 font-extrabold text-lime hover:bg-moss">Novo levantamento</button>
          <a href="/extrato" className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-mist px-6 font-extrabold text-ink hover:border-forest">Ver extrato</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[1.55rem] font-extrabold tracking-[-0.03em] text-forest min-[380px]:text-2xl sm:text-3xl">Levantar dólares</h1>
        <p className="mt-1 font-medium text-ink/60">Recebes em meticais na tua carteira móvel. Os fundos ficam reservados até concluíres.</p>
      </div>

      <div className="rounded-3xl border border-black/5 bg-surface p-4 min-[380px]:p-6">
        <Label htmlFor="valor">Quanto queres levantar?</Label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-3xl font-extrabold text-ink/30">$</span>
          <input id="valor" inputMode="decimal" value={valorUsd} onChange={(e) => setValorUsd(e.target.value.replace(/[^\d.,]/g, ""))} className="h-16 w-full rounded-2xl border-2 border-mist bg-cream pl-11 text-3xl min-[380px]:h-20 min-[380px]:pl-12 min-[380px]:text-4xl font-extrabold tracking-tight text-forest focus:border-forest focus:outline-none" aria-describedby="ajuda-valor" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2" id="ajuda-valor">
          {["20", "50", "100", "250"].map((v) => (
            <button key={v} onClick={() => setValorUsd(v)} className="rounded-full border border-mist bg-surface px-4 py-2 text-sm font-extrabold text-ink/70 transition-colors hover:border-forest hover:text-forest">${v}</button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2" role="tablist" aria-label="Operadora de destino">
          {(["mpesa", "emola"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={metodo === m}
              onClick={() => setMetodo(m)}
              className={cn(
                "flex h-14 items-center justify-center gap-2 rounded-2xl border-2 text-sm font-extrabold transition-all",
                metodo === m ? "border-forest bg-forest text-lime" : "border-mist text-ink/60 hover:border-forest/40",
              )}
            >
              <Smartphone className="h-5 w-5" /> {m === "mpesa" ? "M-Pesa" : "e-Mola"}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <Label htmlFor="destino" hint="o teu número M-Pesa/e-Mola">Número de destino</Label>
          <Input id="destino" type="tel" inputMode="tel" autoComplete="tel" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="+258 84 123 4567" className="font-mono" />
        </div>

        {/* Cotação ao vivo */}
        <div className="mt-4 rounded-2xl bg-sand/60 p-4 text-sm font-semibold text-ink/75">
          {cotando ? (
            <p className="flex items-center gap-2 text-ink/50"><Loader2 className="h-4 w-4 animate-spin" /> A calcular…</p>
          ) : cotacaoVisivel ? (
            <>
              <div className="flex items-center justify-between"><span>Cotação efetiva</span><span>1 USD = MT {cotacaoVisivel.taxaEfetiva.toFixed(2)}</span></div>
              <div className="mt-1.5 flex items-center justify-between"><span>Taxa fixa</span><span>{formatMoeda(cotacaoVisivel.taxaUsdCents, "USD")}</span></div>
              <div className="mt-1.5 flex items-center justify-between"><span>Comissão do agente</span><span>{formatMoeda(cotacaoVisivel.comissaoAgenteCents, "USD")} (paga pela MOZOUT)</span></div>
              <div className="mt-1.5 flex items-center justify-between border-t border-black/10 pt-2 font-extrabold text-forest"><span>Recebes em meticais</span><span>MT {(cotacaoVisivel.valorLiquidoMznCents / 100).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            </>
          ) : (
            <p className="flex items-center gap-1.5 text-ink/45"><Info className="h-4 w-4" /> Mínimo $5.00 — a cotação aparece aqui ao vivo.</p>
          )}
        </div>

        <FieldError>{erro}</FieldError>
        <Button size="lg" className="mt-4 w-full" loading={busy} onClick={confirmar}>
          Confirmar levantamento <ArrowRight className="h-5 w-5" />
        </Button>
        <p className="mt-2 flex items-start gap-1.5 text-[0.7rem] font-semibold leading-snug text-ink/50">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Ao confirmares, ${valorNumero.toFixed(2)} + taxa ficam reservados e deixam de estar disponíveis. Se cancelares dentro do prazo, devolvemos tudo.
        </p>
      </div>

      {/* Levantamentos recentes */}
      {recentes.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-black/5 bg-surface">
          <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
            <h2 className="text-sm font-extrabold uppercase tracking-[0.18em] text-ink/50">Levantamentos recentes</h2>
            <HandCoins className="h-5 w-5 text-forest/60" />
          </div>
          <ul className="divide-y divide-black/5">
            {recentes.map((lev) => {
              const estado = ESTADO_LEVANTAMENTO[lev.estado];
              return (
                <li key={lev.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-ink">{formatMoeda(Math.round(lev.valor_usd * 100), "USD")} · {lev.metodo === "mpesa" ? "M-Pesa" : lev.metodo === "emola" ? "e-Mola" : "USDT"} → {lev.destino}</p>
                    <p className="mt-0.5 text-[0.68rem] font-semibold text-ink/45"><TempoRelativo iso={lev.criado_em} /> · {lev.referencia}{lev.codigo_tx ? ` · TX ${lev.codigo_tx}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={estado?.tone ?? "zinc"}>{estado?.label ?? lev.estado}</Badge>
                    {lev.estado === "aguardando_confirmacao" && (
                      <Button size="sm" variant="dark" loading={busy} onClick={() => confirmarRececao(lev.id)}>Confirmar receção</Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
