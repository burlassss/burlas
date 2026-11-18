"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Copy, Check, ShieldAlert, Loader2,
  Smartphone, Bitcoin, Star, MapPin, Timer, Receipt, ExternalLink, BadgeCheck,
} from "lucide-react";
import { Button, Input, Label, FieldError } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { formatMoeda } from "@/lib/money";

type Metodo = "usdt_trc20" | "mpesa" | "emola";

interface CotacaoMobile {
  taxaBase: number;
  taxaEfetiva: number;
  margemPct: number;
  valorUsdCents: number;
  taxaDepositoCents: number;
  valorLiquidoCents: number;
  taxaPct: number;
  comissaoAgenteCents: number;
}
interface AgenteInfo {
  id: string;
  nome: string;
  telefone: string;
  localizacao: string | null;
  avaliacao_media: number;
  operacoes_concluidas: number;
  tempo_resposta_min: number;
  operadora: string;
}
interface DepositoInfo {
  id: string;
  referencia: string;
  valor_usd: number;
  valor_liquido_usd: number | null;
  valor_mzn: number | null;
  endereco_pagamento: string | null;
  estado: string;
  metodo: Metodo;
}

export function DepositoFlow({ demo }: { demo: boolean }) {
  const { toast } = useToast();
  const [etapa, setEtapa] = React.useState<"metodo" | "valor" | "instrucoes" | "codigo" | "concluido">("metodo");
  const [metodo, setMetodo] = React.useState<Metodo>("usdt_trc20");
  const [valorUsd, setValorUsd] = React.useState("100");
  const [valorMzn, setValorMzn] = React.useState("10 000");
  const [cotacao, setCotacao] = React.useState<CotacaoMobile | null>(null);
  const [cotando, setCotando] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [deposito, setDeposito] = React.useState<DepositoInfo | null>(null);
  const [agente, setAgente] = React.useState<AgenteInfo | null>(null);
  const [codigo, setCodigo] = React.useState("");
  const [copiado, setCopiado] = React.useState<string | null>(null);

  const mznNumero = Number(valorMzn.replace(/\s/g, "").replace(",", ".")) || 0;

  // Cotação ao vivo (debounce) para M-Pesa / e-Mola
  React.useEffect(() => {
    if (etapa !== "valor" || metodo === "usdt_trc20") return;
    if (mznNumero < 100) { setCotacao(null); return; }
    setCotando(true);
    const t = window.setTimeout(async () => {
      try {
        const resp = await fetch(`/api/depositos/cotacao?metodo=${metodo}&mzn=${mznNumero}`);
        if (resp.ok) setCotacao(await resp.json());
      } finally {
        setCotando(false);
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [mznNumero, metodo, etapa]);

  async function copiar(valor: string, chave: string) {
    await navigator.clipboard.writeText(valor);
    setCopiado(chave);
    toast("sucesso", "Copiado para a área de transferência");
    window.setTimeout(() => setCopiado(null), 1800);
  }

  async function criarDeposito() {
    setErro(null);
    setBusy(true);
    try {
      if (metodo === "usdt_trc20") {
        const valor = Number(valorUsd.replace(",", "."));
        if (!Number.isFinite(valor) || valor < 10) { setErro("O mínimo são $10.00."); return; }
        const resp = await fetch("/api/depositos/usdt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valorUsd: valor }) });
        const data = await resp.json();
        if (!resp.ok) { setErro(data.erro); return; }
        setDeposito({ ...data.deposito, metodo: "usdt_trc20" });
        setEtapa("instrucoes");
      } else {
        if (mznNumero < 100) { setErro("O mínimo são MT 100,00."); return; }
        const resp = await fetch("/api/depositos/mobile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metodo, valorMzn: mznNumero }) });
        const data = await resp.json();
        if (!resp.ok) { setErro(data.erro); return; }
        setDeposito({ ...data.deposito, metodo, endereco_pagamento: null });
        setAgente(data.agente);
        setEtapa("instrucoes");
      }
    } catch {
      setErro("Erro de ligação. Tenta novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function simularPagamento() {
    if (!deposito) return;
    setBusy(true);
    try {
      const resp = await fetch(`/api/depositos/${deposito.id}/simular-pagamento`, { method: "POST" });
      if (resp.ok) setEtapa("concluido");
      else toast("erro", "Não foi possível simular");
    } finally {
      setBusy(false);
    }
  }

  async function submeterCodigo() {
    if (!deposito) return;
    if (!/^[A-Za-z0-9-]{5,32}$/.test(codigo.trim())) { setErro("Código inválido — verifica o SMS/USSD da tua carteira."); return; }
    setErro(null);
    setBusy(true);
    try {
      const resp = await fetch(`/api/depositos/${deposito.id}/codigo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo: codigo.trim() }) });
      const data = await resp.json();
      if (!resp.ok) { setErro(data.erro); return; }
      setEtapa("concluido");
    } finally {
      setBusy(false);
    }
  }

  /* ─────────────── Passo 1 · Escolher método ─────────────── */
  if (etapa === "metodo") {
    const cartoes: { id: Metodo; titulo: string; descricao: string; badge?: string; icon: React.ElementType; nota: string }[] = [
      { id: "usdt_trc20", titulo: "USDT (TRC20)", descricao: "Cripto, crédito automático após confirmação na rede.", badge: "Recomendado · 0,5%", icon: Bitcoin, nota: "Crédito em ~1–10 min" },
      { id: "mpesa", titulo: "M-Pesa", descricao: "Transfere para um agente verificado perto de ti.", icon: Smartphone, nota: "Comissão incluída · 1,5%" },
      { id: "emola", titulo: "e-Mola", descricao: "Transfere para um agente e-Mola verificado.", icon: Smartphone, nota: "Comissão incluída · 1,5%" },
    ];
    return (
      <div>
        <PassoCabecalho passo={1} titulo="Como queres depositar?" subtitulo="Escolhe o método — todos convertem para dólares na tua carteira." voltar={false} />
        <div className="grid gap-3">
          {cartoes.map((c) => (
            <button
              key={c.id}
              onClick={() => { setMetodo(c.id); setErro(null); setEtapa("valor"); }}
              className="group flex items-center gap-4 rounded-3xl border-2 border-mist bg-surface p-4 text-left transition-all hover:border-forest hover:shadow-md sm:p-5"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-lime-soft text-forest transition-transform group-hover:scale-105">
                <c.icon className="h-7 w-7" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-extrabold tracking-tight text-ink">{c.titulo}</span>
                  {c.badge && <span className="rounded-full bg-forest px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wider text-lime">{c.badge}</span>}
                </span>
                <span className="mt-0.5 block text-xs font-medium leading-snug text-ink/60">{c.descricao}</span>
                <span className="mt-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink/40">{c.nota}</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-ink/30 transition-transform group-hover:translate-x-1 group-hover:text-forest" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ─────────────── Passo 2 · Valor ─────────────── */
  if (etapa === "valor") {
    return (
      <div>
        <PassoCabecalho
          passo={2}
          titulo={metodo === "usdt_trc20" ? "Quanto queres depositar?" : `Depositar via ${metodo === "mpesa" ? "M-Pesa" : "e-Mola"}`}
          subtitulo={metodo === "usdt_trc20" ? "Indica o valor em dólares (mínimo $10)." : "Indica o valor em meticais — nós convertemos."}
          voltar onVoltar={() => setEtapa("metodo")}
        />

        {metodo === "usdt_trc20" ? (
          <div className="rounded-3xl border border-black/5 bg-surface p-6">
            <Label htmlFor="valor-usd">Valor em dólares</Label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-3xl font-extrabold text-ink/30">$</span>
              <input
                id="valor-usd"
                inputMode="decimal"
                value={valorUsd}
                onChange={(e) => setValorUsd(e.target.value.replace(/[^\d.,]/g, ""))}
                className="h-20 w-full rounded-2xl border-2 border-mist bg-cream pl-12 text-4xl font-extrabold tracking-tight text-forest focus:border-forest focus:outline-none"
                aria-describedby="valor-usd-ajuda"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2" id="valor-usd-ajuda">
              {["25", "50", "100", "250", "500"].map((v) => (
                <button key={v} onClick={() => setValorUsd(v)} className="rounded-full border border-mist bg-surface px-4 py-2 text-sm font-extrabold text-ink/70 transition-colors hover:border-forest hover:text-forest">${v}</button>
              ))}
            </div>
            <ResumoLinha label="Taxa da plataforma (0,5%)" valor={`$${((Number(valorUsd.replace(",", ".")) || 0) * 0.005).toFixed(2)}`} />
            <ResumoLinha label="Recebes na carteira" destaque valor={`$${((Number(valorUsd.replace(",", ".")) || 0) * 0.995).toFixed(2)}`} />
          </div>
        ) : (
          <div className="rounded-3xl border border-black/5 bg-surface p-6">
            <Label htmlFor="valor-mzn">Valor em meticais (MZN)</Label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-extrabold text-ink/30">MT</span>
              <input
                id="valor-mzn"
                inputMode="decimal"
                value={valorMzn}
                onChange={(e) => setValorMzn(e.target.value.replace(/[^\d\s.,]/g, ""))}
                className="h-20 w-full rounded-2xl border-2 border-mist bg-cream pl-16 text-4xl font-extrabold tracking-tight text-forest focus:border-forest focus:outline-none"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["1 000", "5 000", "20 000", "50 000"].map((v) => (
                <button key={v} onClick={() => setValorMzn(v)} className="rounded-full border border-mist bg-surface px-4 py-2 text-sm font-extrabold text-ink/70 transition-colors hover:border-forest hover:text-forest">MT {v}</button>
              ))}
            </div>

            {/* Cotação ao vivo */}
            <div className="mt-4 rounded-2xl bg-sand/60 p-4 text-sm font-semibold text-ink/75">
              {cotando ? (
                <p className="flex items-center gap-2 text-ink/50"><Loader2 className="h-4 w-4 animate-spin" /> A calcular…</p>
              ) : cotacao ? (
                <>
                  <div className="flex items-center justify-between"><span>Cotação</span><span>1 USD = MT {cotacao.taxaBase.toFixed(2)} · margem {cotacao.margemPct.toFixed(2)}%</span></div>
                  <div className="mt-1.5 flex items-center justify-between"><span>Valor em dólares</span><span>{formatMoeda(cotacao.valorUsdCents, "USD")}</span></div>
                  <div className="mt-1.5 flex items-center justify-between"><span>Taxa depósito ({cotacao.taxaPct}%)</span><span>−{formatMoeda(cotacao.taxaDepositoCents, "USD")}</span></div>
                  <div className="mt-1.5 flex items-center justify-between border-t border-black/10 pt-2 font-extrabold text-forest"><span>Recebes</span><span>{formatMoeda(cotacao.valorLiquidoCents, "USD")}</span></div>
                </>
              ) : (
                <p className="text-ink/45">Introduz um valor igual ou maior que MT 100,00 para veres a conversão.</p>
              )}
            </div>
          </div>
        )}

        <FieldError>{erro}</FieldError>
        <Button size="lg" className="mt-4 w-full" loading={busy} onClick={criarDeposito}>
          Continuar <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  /* ─────────────── Passo 3 · Instruções de pagamento ─────────────── */
  if (etapa === "instrucoes" && deposito) {
    if (deposito.metodo === "usdt_trc20") {
      return (
        <div>
          <PassoCabecalho passo={3} titulo="Envia o USDT" subtitulo="Só é creditado após a rede confirmar — nunca antes." voltar={false} />
          <div className="rounded-3xl border border-black/5 bg-surface p-6">
            <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-ink/45">Endereço de depósito · TRC20</p>
            <div className="mt-2 flex items-center gap-2 rounded-2xl border-2 border-dashed border-mist bg-cream p-3">
              <code className="min-w-0 flex-1 break-all font-mono text-xs font-bold text-forest">{deposito.endereco_pagamento}</code>
              <button onClick={() => deposito.endereco_pagamento && copiar(deposito.endereco_pagamento, "endereco")} className="shrink-0 rounded-xl bg-forest p-2.5 text-lime hover:bg-moss" aria-label="Copiar endereço">
                {copiado === "endereco" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-[0.72rem] font-semibold leading-snug text-amber-900">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              Envia apenas USDT na rede Tron (TRC20). Outras moedas ou redes resultam em perda permanente dos fundos.
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-sand/60 p-4">
                <p className="text-[0.6rem] font-extrabold uppercase tracking-wider text-ink/45">Enviar exatamente</p>
                <p className="mt-1 text-2xl font-extrabold text-forest">${deposito.valor_usd.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl bg-sand/60 p-4">
                <p className="text-[0.6rem] font-extrabold uppercase tracking-wider text-ink/45">Referência</p>
                <p className="mt-1 font-mono text-sm font-bold text-ink">{deposito.referencia}</p>
              </div>
            </div>
            <LinhaTempo etapas={["Aguardando pagamento na rede", "Pagamento identificado", "Confirmações da rede", "Crédito na carteira"]} atual={0} />
            {demo && (
              <Button variant="dark" className="mt-4 w-full" loading={busy} onClick={simularPagamento}>
                Simular confirmação na rede (demonstração)
              </Button>
            )}
            <Link href="/extrato" className="mt-2 flex h-11 items-center justify-center gap-2 text-xs font-extrabold text-ink/50 hover:text-forest">
              Ver o estado no extrato <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      );
    }

    // M-Pesa / e-Mola
    const operador = deposito.metodo === "mpesa" ? "M-Pesa" : "e-Mola";
    const transferir = (deposito.valor_mzn ?? 0).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (
      <div>
        <PassoCabecalho passo={3} titulo={`Transfere via ${operador}`} subtitulo="Para concluir, envia o valor exato ao agente indicado." voltar={false} />

        {agente && (
          <div className="rounded-3xl border border-black/5 bg-surface p-5">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-forest text-lg font-black text-lime">
                {agente.nome.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-extrabold text-ink">{agente.nome} <BadgeCheck className="h-4 w-4 text-forest" /></p>
                <a href={`tel:${agente.telefone}`} className="mt-0.5 block font-mono text-sm font-bold text-forest underline underline-offset-2">{agente.telefone}</a>
                {agente.localizacao && <p className="mt-0.5 flex items-center gap-1 text-[0.68rem] font-semibold text-ink/50"><MapPin className="h-3 w-3" /> {agente.localizacao}</p>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-black/5 pt-3 text-[0.68rem] font-bold text-ink/55">
              <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {agente.avaliacao_media.toFixed(1)} · {agente.operacoes_concluidas} operações</span>
              <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> responde em ~{agente.tempo_resposta_min} min</span>
            </div>
          </div>
        )}

        <div className="mt-3 rounded-3xl border border-forest/15 bg-lime-soft p-5">
          <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-forest/70">Como transferir</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm font-semibold leading-snug text-forest">
            <li>Abre o {operador} no teu telefone e escolhe <em>Transferir dinheiro</em>.</li>
            <li>Introduz o número <strong>{agente?.telefone}</strong> e o valor exato de <strong>MT {transferir}</strong>.</li>
            <li>Confirma com o teu PIN e guarda o SMS/USSD com o código da transação.</li>
          </ol>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-white/60 p-3">
              <p className="text-[0.58rem] font-extrabold uppercase tracking-wider text-forest/60">Transferir</p>
              <p className="text-lg font-extrabold text-forest">MT {transferir}</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-3">
              <p className="text-[0.58rem] font-extrabold uppercase tracking-wider text-forest/60">Recebes</p>
              <p className="text-lg font-extrabold text-forest">{formatMoeda(Math.round((deposito.valor_liquido_usd ?? 0) * 100), "USD")}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-white/60 px-3 py-2 text-[0.65rem] font-bold text-forest/80">
            <span>Referência: <span className="font-mono">{deposito.referencia}</span></span>
            <button onClick={() => copiar(deposito.referencia, "ref")} className="rounded-lg p-1.5 hover:bg-white" aria-label="Copiar referência">
              {copiado === "ref" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-black/5 bg-surface p-5">
          <Label htmlFor="codigo-tx">Código da transação</Label>
          <p className="mb-2 mt-0.5 text-xs font-medium text-ink/55">Cola aqui o código que recebeste por SMS/USSD (ex.: MP2411XK92). O mesmo código não pode ser usado duas vezes.</p>
          <div className="flex gap-2">
            <Input id="codigo-tx" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="MP2411XK92" className="font-mono uppercase" autoComplete="off" />
            <Button onClick={submeterCodigo} loading={busy} size="md" className="shrink-0">Submeter</Button>
          </div>
          <FieldError>{erro}</FieldError>
        </div>
      </div>
    );
  }

  /* ─────────────── Concluído ─────────────── */
  return (
    <div className="flex flex-col items-center rounded-3xl border border-black/5 bg-surface px-6 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-lime-soft">
        <CheckCircle2 className="h-9 w-9 text-forest" strokeWidth={1.8} />
      </span>
      <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-forest">{deposito?.metodo === "usdt_trc20" ? "Pagamento confirmado!" : "Recebemos o teu código!"}</h2>
      <p className="mt-1.5 max-w-sm text-sm font-medium text-ink/60">
        {deposito?.metodo === "usdt_trc20"
          ? `${formatMoeda(Math.round((deposito?.valor_liquido_usd ?? 0) * 100), "USD")} foram creditados na tua carteira.`
          : "A operação está em análise. O agente e a equipa MOZOUT vão confirmar o recebimento — assim que for aprovada, o saldo entra na tua carteira."}
      </p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/painel" className="flex h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 font-extrabold text-lime hover:bg-moss">Ir para o painel <ArrowRight className="h-4 w-4" /></Link>
        <Link href="/extrato" className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-mist px-6 font-extrabold text-ink hover:border-forest"><Receipt className="h-4 w-4" /> Ver extrato</Link>
      </div>
    </div>
  );
}

/* ───────────────────────── Subcomponentes ───────────────────────── */
function PassoCabecalho({ passo, titulo, subtitulo, voltar, onVoltar }: { passo: number; titulo: string; subtitulo?: string; voltar?: boolean; onVoltar?: () => void }) {
  return (
    <div className="mb-5">
      {voltar && onVoltar && (
        <button onClick={onVoltar} className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold text-ink/55 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
      )}
      <div className="flex items-center gap-1.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1.5 rounded-full transition-all", i <= passo ? "w-10 bg-forest" : "w-5 bg-mist")} />
        ))}
      </div>
      <h1 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-forest sm:text-3xl">{titulo}</h1>
      {subtitulo && <p className="mt-1 font-medium text-ink/60">{subtitulo}</p>}
    </div>
  );
}

function ResumoLinha({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 border-t border-black/8 pt-2.5 text-sm font-semibold", destaque ? "mt-2.5 font-extrabold text-forest" : "mt-2.5 text-ink/65")}>
      <span>{label}</span>
      <span className="tabular-nums">{valor}</span>
    </div>
  );
}

function LinhaTempo({ etapas, atual }: { etapas: string[]; atual: number }) {
  return (
    <ol className="mt-4 space-y-0">
      {etapas.map((e, i) => {
        const feito = i < atual;
        const ativo = i === atual;
        return (
          <li key={i} className="flex items-center gap-3">
            <span className="flex flex-col items-center">
              <span className={cn("h-3.5 w-3.5 rounded-full border-2", feito ? "border-forest bg-forest" : ativo ? "border-forest bg-lime" : "border-mist bg-surface")} />
              {i < etapas.length - 1 && <span className={cn("h-7 w-0.5", feito ? "bg-forest" : "bg-mist")} />}
            </span>
            <span className={cn("pb-4 text-xs font-bold", ativo ? "text-forest" : feito ? "text-ink/60" : "text-ink/35")}>{e}</span>
          </li>
        );
      })}
    </ol>
  );
}
