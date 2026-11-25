"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingBag, Repeat2, Plane, Check, Wallet, BadgeCheck, ArrowRight, Loader2, CreditCard, Smartphone,
} from "lucide-react";
import { Button, Modal, Badge } from "@/components/ui";
import { VirtualCard } from "@/components/virtual-card";
import { EmolaCheckout, type EmolaCheckoutResultado } from "@/components/emola-checkout";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { formatMoeda, formatUnits } from "@/lib/money";
import type { PlanTipo, PlanoTier } from "@/lib/db/types";
import { TIER_INFO } from "@/lib/themes";
import { Crown } from "lucide-react";

const ICONE: Record<PlanTipo, React.ElementType> = {
  compras: ShoppingBag,
  assinaturas: Repeat2,
  viagem: Plane,
};

export interface PlanoResumo {
  id: string;
  nome: string;
  tipo: PlanTipo;
  descricao: string;
  taxa_ativacao_usd: number;
  mensalidade_usd: number;
  limite_gasto_usd: number;
  limite_carga_usd: number;
  validade_meses: number;
  beneficios: string[];
  destaque: boolean;
  tier?: PlanoTier;
}
export interface CartaoExistente {
  id: string;
  plan_id: string;
  planNome: string;
  tipo: string;
  tier?: PlanoTier | null;
  estado: "ativo" | "congelado" | "cancelado" | "pendente";
  validade: string;
  limite_mensal: number;
  ultimos4: string;
  titular: string;
}

export function CartoesView({ planos, cartoes, saldoCents, telefone }: { planos: PlanoResumo[]; cartoes: CartaoExistente[]; saldoCents: number; telefone?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [escolhido, setEscolhido] = React.useState<PlanoResumo | null>(null);
  const [metodo, setMetodo] = React.useState<"saldo" | "emola" | null>(null);
  const [busy, setBusy] = React.useState(false);

  function fecharModal() {
    setEscolhido(null);
    setMetodo(null);
  }

  async function solicitar() {
    if (!escolhido) return;
    setBusy(true);
    try {
      const resp = await fetch("/api/cartoes/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: escolhido.id }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast("erro", "Não foi possível emitir o cartão", data.erro);
        return;
      }
      toast("sucesso", "Cartão emitido!", "Já podes usá-lo no teu painel.");
      fecharModal();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  /** Pagamento e-Mola concluído (sem agente) → cartão já emitido no servidor. */
  function concluirEmola(r: EmolaCheckoutResultado) {
    toast(
      "sucesso",
      "Pagamento e-Mola concluído!",
      `${formatUnits(r.valorMzn, "MZN")} recebidos · ref. ${r.transRef}. O cartão já está activo.`,
    );
    fecharModal();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8 pt-1 sm:pt-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest sm:text-3xl">Os teus cartões</h1>
        <p className="mt-1 font-medium text-ink/60">Cartões virtuais VISA, emitidos na hora. Saldo disponível: <strong className="text-forest">{formatMoeda(saldoCents, "USD")}</strong></p>
      </div>

      {/* Cartões atuais */}
      {cartoes.length > 0 && (
        <section>
          <h2 className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-ink/50">Emitidos</h2>
          <div className="mt-3 grid gap-6 sm:grid-cols-2">
            {cartoes.map((cartao) => (
              <div key={cartao.id} className="flex flex-col items-start gap-2">
                <VirtualCard
                  numero={cartao.ultimos4.padStart(16, "0")}
                  validade={cartao.validade}
                  titular={cartao.titular}
                  estado={cartao.estado}
                  planNome={cartao.planNome}
                  tipo={cartao.tipo}
                  tier={cartao.tier}
                  revelado={false}
                  className="max-w-xs"
                />
                <div className="flex items-center gap-2">
                  <Badge tone={cartao.estado === "ativo" ? "green" : cartao.estado === "congelado" ? "amber" : "red"}>{cartao.estado}</Badge>
                  <Link href="/painel" className="text-xs font-extrabold text-forest hover:text-moss">Gerir no painel →</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Planos */}
      <section>
        <h2 className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-ink/50">Planos disponíveis</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {planos.map((plano) => {
            const Icone = ICONE[plano.tipo] ?? ShoppingBag;
            const jaTem = cartoes.some((c) => c.plan_id === plano.id && c.estado !== "cancelado");
            return (
              <div key={plano.id} className={cn("flex flex-col rounded-3xl border p-5", plano.destaque ? "border-forest bg-forest text-cream" : "border-black/5 bg-surface")}>
                <div className="flex items-start justify-between gap-2">
                  <Icone className={cn("h-8 w-8", plano.destaque ? "text-lime" : "text-forest")} strokeWidth={1.7} />
                  <span className="flex flex-col items-end gap-1">
                    {plano.destaque && <span className="rounded-full bg-lime px-2.5 py-1 text-[0.6rem] font-extrabold uppercase tracking-wider text-pine">Popular</span>}
                    {plano.tier && <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6rem] font-extrabold uppercase tracking-wider", plano.destaque ? "bg-white/15 text-lime" : "bg-sand text-ink/60")}><Crown className="h-3 w-3" /> {TIER_INFO[plano.tier].label}</span>}
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-extrabold tracking-tight">{plano.nome}</h3>
                <p className={cn("mt-1 text-xs font-medium leading-snug", plano.destaque ? "text-cream/75" : "text-ink/60")}>{plano.descricao}</p>
                <div className="mt-4 flex items-end gap-1.5">
                  <span className="text-3xl font-extrabold tracking-tight">${plano.taxa_ativacao_usd.toFixed(0)}</span>
                  <span className={cn("pb-1 text-[0.65rem] font-bold uppercase tracking-wide", plano.destaque ? "text-cream/55" : "text-ink/50")}>
                    ativação{plano.mensalidade_usd > 0 ? ` · $${plano.mensalidade_usd}/mês` : " · sem mensalidade"}
                  </span>
                </div>
                <ul className="mt-3 space-y-1.5 text-[0.78rem] font-semibold">
                  {plano.beneficios.slice(0, 4).map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", plano.destaque ? "text-lime" : "text-forest")} strokeWidth={3} />
                      <span className={plano.destaque ? "text-cream/85" : "text-ink/75"}>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 border-t border-black/10 pt-3 text-[0.65rem] font-bold uppercase tracking-wide opacity-70">
                  Limite ${plano.limite_gasto_usd.toLocaleString()}/mês · {plano.validade_meses} meses
                </div>
                <button
                  onClick={() => setEscolhido(plano)}
                  disabled={jaTem}
                  className={cn(
                    "mt-4 inline-flex h-12 items-center justify-center gap-2 rounded-full font-extrabold transition-all",
                    jaTem ? "cursor-not-allowed bg-mist text-ink/40" : plano.destaque ? "bg-lime text-pine hover:bg-lime-strong" : "border-2 border-forest text-forest hover:bg-forest hover:text-lime",
                  )}
                >
                  {jaTem ? (<><BadgeCheck className="h-5 w-5" /> Já tens</>) : (<><CreditCard className="h-5 w-5" /> Escolher</>)}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal de confirmação */}
      <Modal open={!!escolhido} onClose={fecharModal} title={`Ativar ${escolhido?.nome}`}>
        {escolhido && (
          <div className="flex flex-col gap-4">
            {/* ── Escolha do método de pagamento ─────────────── */}
            {metodo === null && (
              <>
                <div className="rounded-2xl bg-sand/60 p-4 text-sm font-semibold text-ink/75">
                  <div className="flex items-center justify-between"><span>Taxa de ativação</span><span className="tabular-nums">${escolhido.taxa_ativacao_usd.toFixed(2)}</span></div>
                  <div className="mt-1.5 flex items-center justify-between"><span>Mensalidade</span><span className="tabular-nums">{escolhido.mensalidade_usd > 0 ? `$${escolhido.mensalidade_usd.toFixed(2)}/mês` : "Sem mensalidade"}</span></div>
                  <div className="mt-1.5 flex items-center justify-between"><span>Limite de gastos</span><span className="tabular-nums">${escolhido.limite_gasto_usd.toLocaleString("pt-MZ")}/mês</span></div>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink/45">Escolhe como queres pagar</p>
                <button
                  onClick={() => setMetodo("saldo")}
                  disabled={saldoCents < Math.round(escolhido.taxa_ativacao_usd * 100)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                    saldoCents < Math.round(escolhido.taxa_ativacao_usd * 100)
                      ? "cursor-not-allowed border-mist bg-sand/40 opacity-60"
                      : "border-forest bg-surface hover:bg-sand/60",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Wallet className="h-5 w-5 text-forest" />
                    <span>
                      <span className="block text-sm font-extrabold text-ink">Saldo MOZOUT</span>
                      <span className="block text-xs font-semibold text-ink/55">Disponível: {formatMoeda(saldoCents, "USD")}</span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-ink/40" />
                </button>
                {saldoCents < Math.round(escolhido.taxa_ativacao_usd * 100) && (
                  <p className="-mt-2 text-xs font-semibold text-amber-700">
                    Saldo insuficiente — <Link href="/depositar" className="font-extrabold underline underline-offset-2">faz um depósito</Link> ou paga com e-Mola.
                  </p>
                )}
                <button
                  onClick={() => setMetodo("emola")}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-forest bg-forest p-4 text-left text-cream transition-all hover:bg-moss"
                >
                  <span className="flex items-center gap-2.5">
                    <Smartphone className="h-5 w-5 text-lime" />
                    <span>
                      <span className="block text-sm font-extrabold">Pagar com e-Mola</span>
                      <span className="block text-xs font-semibold text-cream/70">Directo da tua carteira e-Mola — sem agente, na hora</span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-lime" />
                </button>
              </>
            )}

            {/* ── Pagamento com saldo ────────────────────────── */}
            {metodo === "saldo" && (
              <>
                <div className="rounded-2xl bg-sand/60 p-4 text-sm font-semibold text-ink/75">
                  <div className="flex items-center justify-between"><span>Taxa de ativação</span><span className="tabular-nums">${escolhido.taxa_ativacao_usd.toFixed(2)}</span></div>
                  <div className="mt-1.5 flex items-center justify-between"><span>Mensalidade</span><span className="tabular-nums">{escolhido.mensalidade_usd > 0 ? `$${escolhido.mensalidade_usd.toFixed(2)}/mês` : "Sem mensalidade"}</span></div>
                  <div className="mt-1.5 flex items-center justify-between"><span>Limite de gastos</span><span className="tabular-nums">${escolhido.limite_gasto_usd.toLocaleString("pt-MZ")}/mês</span></div>
                  <div className="mt-1.5 flex items-center justify-between border-t border-black/10 pt-2 font-extrabold text-forest"><span>Saldo após ativação</span><span className="tabular-nums">{formatMoeda(saldoCents - Math.round(escolhido.taxa_ativacao_usd * 100), "USD")}</span></div>
                </div>
                <p className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-ink/55"><Wallet className="mt-0.5 h-4 w-4 shrink-0" /> O valor da ativação é debitado do teu saldo de imediato, com lançamento no extrato. A emissão é instantânea.</p>
                <Button size="lg" className="w-full" loading={busy} disabled={saldoCents < Math.round(escolhido.taxa_ativacao_usd * 100)} onClick={solicitar}>
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <BadgeCheck className="h-5 w-5" />} Pagar ativação e emitir cartão
                </Button>
                <button type="button" className="text-center text-xs font-bold text-ink/50 hover:text-ink" onClick={() => setMetodo(null)} disabled={busy}>
                  ← Outro método de pagamento
                </button>
              </>
            )}

            {/* ── Pagamento e-Mola (directo, sem agente) ─────── */}
            {metodo === "emola" && (
              <EmolaCheckout
                planId={escolhido.id}
                titulo={`${escolhido.nome} — taxa de ativação $${escolhido.taxa_ativacao_usd.toFixed(2)}`}
                telefoneInicial={telefone}
                onConcluido={concluirEmola}
                onCancelar={() => setMetodo(null)}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
