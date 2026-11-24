"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye, EyeOff, ArrowDownToLine, ArrowUpRight, Info, Copy, Snowflake, Sun,
  Check, Loader2, CreditCard, ArrowLeftRight, Lock, Wallet, CalendarClock, Sparkles,
} from "lucide-react";
import { PremiumCard } from "./premium-card";
import { Modal, Badge } from "./ui";
import { useToast } from "./toast";
import { maskCard } from "@/lib/utils";
import { formatMoeda } from "@/lib/money";

import type { PlanoTier } from "@/lib/db/types";

export interface HeroCartao {
  id: string;
  planNome: string;
  tipo: string;
  tier?: PlanoTier | null;
  estado: "ativo" | "congelado" | "cancelado" | "pendente";
  validade: string;
  limiteMensal: number;
  gastosMesCents: number;
  ultimos4: string;
  titular: string;
}

export function CarteiraHero({
  saldoCents,
  reservadoCents,
  mznEquivalente,
  cotacao,
  margemPct,
  cartoes,
}: {
  saldoCents: number;
  reservadoCents: number;
  mznEquivalente: number;
  cotacao: number;
  margemPct: number;
  cartoes: HeroCartao[];
}) {
  const [cartaoId, setCartaoId] = React.useState(cartoes[0]?.id ?? "");
  const cartao = cartoes.find((c) => c.id === cartaoId) ?? cartoes[0] ?? null;
  const router = useRouter();
  const { toast } = useToast();
  const [visivel, setVisivel] = React.useState(true);
  const [revelado, setRevelado] = React.useState(false);
  const [dados, setDados] = React.useState<{ numero: string; cvv: string } | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [detalhesAberto, setDetalhesAberto] = React.useState(false);
  const [copiado, setCopiado] = React.useState(false);
  const [taxaLive, setTaxaLive] = React.useState(cotacao);
  const [variacaoTaxa, setVariacaoTaxa] = React.useState<"alta" | "baixa" | null>(null);

  // Actualiza a cotação verdadeira (configurada pela administração), sem simular flutuações.
  React.useEffect(() => {
    let anterior = cotacao;
    const atualizar = async () => {
      try {
        const r = await fetch("/api/cotacao", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json() as { valor: number };
        if (!Number.isFinite(d.valor)) return;
        if (d.valor !== anterior) {
          setVariacaoTaxa(d.valor > anterior ? "alta" : "baixa");
          anterior = d.valor;
          setTaxaLive(d.valor);
          window.setTimeout(() => setVariacaoTaxa(null), 2200);
        }
      } catch { /* mantém a última cotação disponível */ }
    };
    void atualizar();
    const id = window.setInterval(() => void atualizar(), 30_000);
    return () => window.clearInterval(id);
  }, [cotacao]);

  async function obterDados() {
    if (!cartao) return null;
    if (dados) return dados;
    const resp = await fetch(`/api/cartoes/${cartao.id}/revelar`, { method: "POST" });
    const json = await resp.json().catch(() => null);
    if (!resp.ok) {
      toast("erro", "Não foi possível revelar o cartão", json?.erro);
      return null;
    }
    const novos = { numero: json.numero as string, cvv: String(json.cvv) };
    setDados(novos);
    return novos;
  }

  async function alternarRevelar() {
    if (revelado) return setRevelado(false);
    setBusy("revelar");
    const d = await obterDados();
    setBusy(null);
    if (d) setRevelado(true);
  }

  async function copiarNumero() {
    if (!cartao) return;
    setBusy("copiar");
    const d = await obterDados();
    setBusy(null);
    if (!d) return;
    await navigator.clipboard.writeText(d.numero.replace(/\s/g, ""));
    setCopiado(true);
    toast("sucesso", "Número copiado", "Cola no checkout onde quiseres.");
    window.setTimeout(() => setCopiado(false), 1800);
  }

  async function alternarCongelado() {
    if (!cartao) return;
    const acao = cartao.estado === "congelado" ? "descongelar" : "congelar";
    setBusy("congelar");
    const resp = await fetch(`/api/cartoes/${cartao.id}/estado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao }),
    });
    setBusy(null);
    if (resp.ok) {
      toast("sucesso", acao === "congelar" ? "Cartão congelado" : "Cartão descongelado");
      router.refresh();
    } else {
      const json = await resp.json().catch(() => null);
      toast("erro", "Não foi possível alterar o estado", json?.erro);
    }
  }

  const pctLimite = cartao ? Math.min(100, (cartao.gastosMesCents / Math.max(cartao.limiteMensal * 100, 1)) * 100) : 0;

  return (
    <section
      aria-label="A tua carteira"
      className="relative min-w-0 overflow-hidden rounded-[1.75rem] bg-pine text-cream shadow-[0_2px_6px_rgb(0_0_0/0.3),0_40px_80px_-32px_rgb(18_31_22/0.7)] sm:rounded-[2rem]"
    >
      {/* textura de pontos + brilhos */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.35]" style={{ backgroundImage: "radial-gradient(rgb(255 255 255 / 0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-lime/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative grid gap-5 p-4 min-[380px]:gap-6 min-[380px]:p-5 lg:grid-cols-12 lg:gap-8 lg:p-8">
        {/* ═══════════ CARTÃO ═══════════ */}
        <div className="flex min-w-0 flex-col lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.58rem] font-extrabold uppercase tracking-[0.18em] text-lime/85 min-[380px]:text-[0.62rem] sm:text-[0.68rem] sm:tracking-[0.24em]">
              {cartao ? "O teu cartão MOZOUT" : "O teu cartão espera por ti"}
            </p>
            {cartao && (
              <Badge tone={cartao.estado === "ativo" ? "green" : cartao.estado === "congelado" ? "amber" : "red"}>
                {cartao.estado === "ativo" ? "Ativo" : cartao.estado === "congelado" ? "Congelado" : cartao.estado}
              </Badge>
            )}
          </div>

          {cartoes.length > 1 && (
            <div className="mt-3" aria-label="Selecionar cartão">
              <p className="mb-1.5 text-[0.62rem] font-bold uppercase tracking-wider text-cream/55">Os teus cartões · {cartoes.length}</p>
              <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Cartões da carteira">
                {cartoes.map((c, index) => (
                  <button key={c.id} type="button" role="tab" aria-selected={c.id === cartao?.id} onClick={() => {
                    setCartaoId(c.id);
                    setRevelado(false);
                    setDados(null);
                    setDetalhesAberto(false);
                  }} className={`shrink-0 rounded-xl border px-3 py-2 text-left transition-colors ${c.id === cartao?.id ? "border-lime bg-lime/15 text-lime" : "border-white/15 bg-white/5 text-cream/75 hover:bg-white/10"}`}>
                    <span className="block text-[0.68rem] font-extrabold">{c.planNome || `Cartão ${index + 1}`}</span>
                    <span className="mt-0.5 block font-mono text-[0.62rem]">•••• {c.ultimos4}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-1 flex-col items-center justify-center">
            {cartao ? (
              <>
                <PremiumCard
                  numero={revelado && dados ? dados.numero : null}
                  ultimos4={cartao.ultimos4}
                  validade={cartao.validade}
                  cvv={revelado && dados ? dados.cvv : null}
                  titular={cartao.titular}
                  estado={cartao.estado}
                  planNome={cartao.planNome}
                  tipo={cartao.tipo}
                  tier={cartao.tier}
                  revelado={revelado}
                />
                {/* ações */}
                <div className="mt-3 grid w-full grid-cols-4 items-stretch justify-center gap-1.5 sm:gap-2">
                  <HeroAction onClick={alternarRevelar} busy={busy === "revelar"} icon={revelado ? EyeOff : Eye} label={revelado ? "Ocultar" : "Revelar"} />
                  <HeroAction onClick={copiarNumero} busy={busy === "copiar"} icon={copiado ? Check : Copy} label={copiado ? "Copiado!" : "Copiar nº"} />
                  <HeroAction onClick={alternarCongelado} busy={busy === "congelar"} icon={cartao.estado === "congelado" ? Sun : Snowflake} label={cartao.estado === "congelado" ? "Descongelar" : "Congelar"} />
                  <HeroAction onClick={() => setDetalhesAberto(true)} icon={Info} label="Detalhes" />
                </div>
              </>
            ) : (
              <Link
                href="/cartoes"
                className="group flex aspect-[8/5] w-full max-w-[440px] flex-col items-center justify-center gap-3 rounded-[1.6rem] border-2 border-dashed border-lime/30 bg-white/[0.03] p-6 text-center transition-colors hover:border-lime/60 hover:bg-white/[0.06]"
                aria-label="Pedir o teu primeiro cartão virtual"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-lime/15 transition-transform duration-300 group-hover:scale-110">
                  <CreditCard className="h-8 w-8 text-lime" strokeWidth={1.6} />
                </span>
                <span className="text-lg font-extrabold tracking-tight text-cream sm:text-xl">Ainda não tens cartão</span>
                <span className="max-w-[26ch] text-xs font-medium leading-relaxed text-cream/60">VISA virtual, emitido na hora, aceito em milhões de lojas online.</span>
                <span className="mt-1 inline-flex h-11 items-center gap-2 rounded-full bg-lime px-6 text-sm font-extrabold text-pine transition-all group-hover:bg-lime-strong">
                  <Sparkles className="h-4 w-4" /> Pedir cartão — a partir de $5
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* ═══════════ SALDO + STATS (abaixo do cartão) ═══════════ */}
        <div className="flex min-w-0 flex-col border-t border-white/10 pt-5 lg:col-span-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          {/* saldo */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.58rem] font-extrabold uppercase tracking-[0.18em] text-lime/85 min-[380px]:text-[0.62rem] sm:text-[0.68rem] sm:tracking-[0.24em]">Saldo disponível · USD</p>
            <button
              onClick={() => setVisivel((v) => !v)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[0.68rem] font-bold text-cream/85 transition-colors hover:bg-white/10"
              aria-pressed={visivel}
            >
              {visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {visivel ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <p className="mt-1.5 min-w-0 whitespace-nowrap [font-size:clamp(2.05rem,10.8vw,2.6rem)] font-extrabold leading-[1.02] tracking-[-0.045em] tabular-nums text-cream sm:text-6xl">
            {visivel ? formatMoeda(saldoCents, "USD") : "$ ••••••"}
          </p>
          <p className="mt-1.5 text-xs font-semibold text-cream/60 sm:text-sm">
            {visivel ? (
              <>≈ MT {(cotacao > 0 ? mznEquivalente * taxaLive / cotacao : mznEquivalente).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · 1 USD = MT {taxaLive.toFixed(2)}</>
            ) : "≈ MT ••••••••"}
          </p>

          {/* stats */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.05] p-2.5 min-[380px]:p-3 sm:p-3.5">
              <p className="flex items-center gap-1.5 text-[0.52rem] font-extrabold uppercase tracking-[0.18em] text-lime/80 sm:text-[0.58rem]"><ArrowLeftRight className="h-3.5 w-3.5" /> Câmbio do dia</p>
              <p aria-live="polite" className={`mt-1.5 flex items-center gap-1 whitespace-nowrap [font-size:clamp(0.7rem,3.7vw,0.95rem)] sm:text-base font-extrabold tabular-nums transition-colors duration-500 ${variacaoTaxa === "alta" ? "text-emerald-300" : variacaoTaxa === "baixa" ? "text-rose-300" : "text-cream"}`}>
                <span>1 USD = MT {taxaLive.toFixed(2)}</span>
                {variacaoTaxa && <span className="text-[0.65rem]" aria-label={variacaoTaxa === "alta" ? "Cotação subiu" : "Cotação desceu"}>{variacaoTaxa === "alta" ? "▲" : "▼"}</span>}
              </p>
              <p className="text-[0.6rem] font-bold text-cream/50 sm:text-[0.65rem]">Atualização automática · margem {margemPct.toFixed(2)}%</p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.05] p-2.5 min-[380px]:p-3 sm:p-3.5">
              <p className="flex items-center gap-1.5 text-[0.52rem] font-extrabold uppercase tracking-[0.18em] text-lime/80 sm:text-[0.58rem]"><Lock className="h-3.5 w-3.5" /> Reservado</p>
              <p className="mt-1.5 truncate [font-size:clamp(0.7rem,3.7vw,0.875rem)] sm:text-base font-extrabold tabular-nums text-cream">{visivel ? formatMoeda(reservadoCents, "USD") : "$ ••••"}</p>
              <p className="text-[0.6rem] font-bold text-cream/50 sm:text-[0.65rem]">em operações ativas</p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.05] p-2.5 min-[380px]:p-3 sm:p-3.5">
              <p className="flex items-center gap-1.5 text-[0.52rem] font-extrabold uppercase tracking-[0.18em] text-lime/80 sm:text-[0.58rem]"><Wallet className="h-3.5 w-3.5" /> Gasto no mês</p>
              <p className="mt-1.5 truncate [font-size:clamp(0.7rem,3.7vw,0.875rem)] sm:text-base font-extrabold tabular-nums text-cream">{cartao ? formatMoeda(cartao.gastosMesCents, "USD") : "$ 0.00"}</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-lime transition-all duration-500" style={{ width: `${cartao ? pctLimite : 0}%` }} />
              </div>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.05] p-2.5 min-[380px]:p-3 sm:p-3.5">
              <p className="flex items-center gap-1.5 text-[0.52rem] font-extrabold uppercase tracking-[0.18em] text-lime/80 sm:text-[0.58rem]"><CalendarClock className="h-3.5 w-3.5" /> Validade</p>
              <p className="mt-1.5 truncate [font-size:clamp(0.7rem,3.7vw,0.875rem)] sm:text-base font-extrabold tabular-nums text-cream">{cartao ? cartao.validade : "— / —"}</p>
              <p className="text-[0.6rem] font-bold text-cream/50 sm:text-[0.65rem]">{cartao ? cartao.planNome : "sem cartão ainda"}</p>
            </div>
          </div>

          {/* ações */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/depositar" className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-lime px-3 text-sm font-extrabold text-pine transition-all hover:bg-lime-strong sm:text-base">
              <ArrowDownToLine className="h-5 w-5" strokeWidth={2.4} /> Depositar
            </Link>
            <Link href="/levantar" className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-lime/40 px-3 text-sm font-extrabold text-lime transition-all hover:border-lime hover:bg-lime/10 sm:text-base">
              <ArrowUpRight className="h-5 w-5" strokeWidth={2.4} /> Levantar
            </Link>
          </div>
        </div>
      </div>

      {/* ═══════════ Modal de detalhes ═══════════ */}
      {cartao && (
        <Modal open={detalhesAberto} onClose={() => setDetalhesAberto(false)} title="Detalhes do cartão">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Plano", cartao.planNome],
              ["Titular", cartao.titular],
              ["Número", revelado && dados ? dados.numero.replace(/(.{4})/g, "$1 ").trim() : maskCard(cartao.ultimos4)],
              ["Validade", cartao.validade],
              ["Estado", cartao.estado === "ativo" ? "Ativo" : cartao.estado === "congelado" ? "Congelado" : "Cancelado"],
              ["Limite mensal", `$${cartao.limiteMensal.toLocaleString("pt-MZ", { minimumFractionDigits: 2 })}`],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-2xl bg-sand/60 p-3">
                <dt className="text-[0.62rem] font-extrabold uppercase tracking-wider text-ink/50">{k}</dt>
                <dd className="mt-0.5 break-all font-mono text-[0.8rem] font-bold text-ink">{String(v)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-bold text-ink/60">
              <span>Gasto este mês</span>
              <span>{formatMoeda(cartao.gastosMesCents, "USD")} de ${cartao.limiteMensal.toLocaleString("pt-MZ")}</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full bg-forest transition-all" style={{ width: `${pctLimite}%` }} />
            </div>
          </div>
          <p className="mt-4 text-center text-[0.7rem] font-semibold text-ink/45">
            Problema com o cartão? <Link href="mailto:suporte@mozout.co.mz" className="text-forest underline underline-offset-2">Fala connosco</Link>
          </p>
        </Modal>
      )}
    </section>
  );
}

function HeroAction({ onClick, icon: Icon, label, busy }: { onClick: () => void; icon: React.ElementType; label: string; busy?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-white/12 bg-white/[0.06] px-1.5 py-2 text-[0.52rem] font-extrabold text-cream/85 min-[380px]:text-[0.58rem] transition-all hover:border-lime/50 hover:bg-white/10 hover:text-lime disabled:opacity-60 sm:min-w-[5rem]"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" strokeWidth={2} />}
      <span className="leading-tight">{label}</span>
    </button>
  );
}
