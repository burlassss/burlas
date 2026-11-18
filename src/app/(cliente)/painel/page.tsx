import Link from "next/link";

function safeUltimos4(numero: string): string {
  try { return decryptSecret(numero).slice(-4); } catch { return "••••"; }
}
import { ArrowRight, CreditCard, FileText, LifeBuoy, ArrowDownToLine, ArrowUpRight, Receipt } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataMode } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { cotacao } from "@/lib/services/fx";
import { formatDataHora, formatMoeda, fromCents } from "@/lib/money";
import { TIPO_MOVIMENTO } from "@/lib/labels";
import { CarteiraHero } from "@/components/carteira-hero";
import { MovimentoIcon } from "@/components/movimento";
import { Badge } from "@/components/ui";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PainelPage() {
  const user = await requireUser();
  const demo = dataMode() === "demo";

  const [saldoCents, reservadoCents, recentes, cards, cx] = await Promise.all([
    db.balanceCents(user.id),
    db.activeReservationsCents(user.id),
    db.listLedger(user.id, { limit: 5 }),
    db.listCardsByUser(user.id),
    cotacao("USD/MZN"),
  ]);

  const card = cards[0] ?? null;
  const plan = card ? await db.findPlan(card.plan_id) : null;
  const ultimos4 = card ? safeUltimos4(card.numero) : "0000";

  // Gasto do mês corrente (compras) para a barra de limite
  const mesAtual = new Date().toISOString().slice(0, 7);
  const todos = await db.listLedger(user.id, { limit: 500 });
  const gastoMesCents = todos
    .filter((e) => e.tipo === "compra" && e.criado_em.slice(0, 7) === mesAtual)
    .reduce((acc, e) => acc + Math.abs(Math.round(e.valor * 100)), 0);

  const mznEquivalente = (fromCents(saldoCents) * cx.valorEfetivo);
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const primeiroNome = user.nome.trim().split(/\s+/)[0];

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Saudação */}
      <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[1.55rem] font-extrabold tracking-[-0.03em] text-forest min-[380px]:text-2xl sm:text-3xl">{saudacao}, {primeiroNome}</h1>
          <p className="mt-0.5 text-sm font-medium text-ink/55">Aqui está o resumo da tua carteira hoje.</p>
        </div>
        {demo && (
          <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-wider text-amber-800">
            Modo demonstração
          </span>
        )}
      </div>

      {/* Carteira: cartão premium 3D + saldo, câmbio e gastos */}
      <CarteiraHero
        saldoCents={saldoCents}
        reservadoCents={reservadoCents}
        mznEquivalente={mznEquivalente}
        cotacao={cx.valorEfetivo}
        margemPct={cx.margemPct}
        cartao={card ? {
          id: card.id,
          planNome: plan?.nome ?? "Cartão MOZOUT",
          tipo: plan?.tipo ?? "compras",
          estado: card.estado,
          validade: card.validade,
          limiteMensal: card.limite_mensal,
          gastosMesCents: gastoMesCents,
          ultimos4,
          titular: card.titular,
        } : null}
      />

      {/* Ações rápidas */}
      <nav className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-4 sm:gap-3" aria-label="Ações rápidas">
        {[
          { href: "/depositar", rotulo: "Depositar", icone: ArrowDownToLine },
          { href: "/levantar", rotulo: "Levantar", icone: ArrowUpRight },
          { href: "/cartoes", rotulo: "Novo cartão", icone: CreditCard },
          { href: "/extrato", rotulo: "Extrato", icone: Receipt },
        ].map((a) => (
          <Link key={a.href + a.rotulo} href={a.href} className="flex flex-col items-center gap-1.5 rounded-2xl border border-black/5 bg-surface py-3 text-center text-[0.72rem] leading-tight font-extrabold text-ink/75 shadow-sm transition-all hover:border-forest hover:text-forest">
            <a.icone className="h-5 w-5 text-forest" strokeWidth={2.2} />
            {a.rotulo}
          </Link>
        ))}
      </nav>

      {/* Movimentações + carril lateral */}
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="overflow-hidden rounded-[1.75rem] border border-black/5 bg-surface shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 sm:px-6">
            <h2 className="font-extrabold tracking-tight text-ink">Movimentações recentes</h2>
            <Link href="/extrato" className="flex items-center gap-1 text-xs font-extrabold text-forest hover:text-moss">Ver extrato <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          {recentes.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm font-medium text-ink/50">Sem movimentos ainda. Faz o teu primeiro depósito!</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {recentes.map((mov) => {
                const positivo = mov.valor >= 0;
                return (
                  <li key={mov.id} className="flex items-center gap-2.5 px-4 py-3 sm:gap-3 sm:px-6 sm:py-3.5">
                    <MovimentoIcon tipo={mov.tipo} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{mov.descricao || TIPO_MOVIMENTO[mov.tipo]}</p>
                      <p className="text-[0.68rem] font-semibold text-ink/45">{formatDataHora(mov.criado_em)}{mov.estado !== "confirmado" && " · pendente"}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[0.78rem] font-extrabold tabular-nums min-[380px]:text-sm ${positivo ? "text-forest" : "text-ink"}`}>
                        {positivo ? "+" : ""}{formatMoeda(Math.round(mov.valor * 100), "USD")}
                      </p>
                      <p className="text-[0.62rem] font-bold uppercase tracking-wider text-ink/40">{TIPO_MOVIMENTO[mov.tipo] ?? mov.tipo}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Carril lateral */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-[1.75rem] border border-forest/10 bg-gradient-to-br from-forest to-pine p-5 text-cream">
            <FileText className="h-6 w-6 text-lime" strokeWidth={1.8} />
            <h3 className="mt-2 font-extrabold tracking-tight">Precisas do extrato?</h3>
            <p className="mt-1 text-xs font-medium leading-relaxed text-cream/70">Filtra por tipo e exporta em PDF ou CSV para o teu contabilista.</p>
            <Link href="/extrato" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-lime px-4 py-2 text-xs font-extrabold text-pine hover:bg-lime-strong">Abrir extrato <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="rounded-[1.75rem] border border-black/5 bg-surface p-5 shadow-sm">
            <LifeBuoy className="h-6 w-6 text-forest" strokeWidth={1.8} />
            <h3 className="mt-2 font-extrabold tracking-tight text-ink">Apoio humano, a sério</h3>
            <p className="mt-1 text-xs font-medium leading-relaxed text-ink/60">Problemas com um depósito ou levantamento? Fala connosco — respondemos em minutos em dias úteis.</p>
            <div className="mt-3 flex items-center justify-between text-xs font-bold text-ink/55">
              <span>suporte@mozout.co.mz</span>
              <Badge tone="green">Online</Badge>
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-black/5 bg-surface p-5 shadow-sm">
            <ShieldCheck className="h-6 w-6 text-forest" strokeWidth={1.8} />
            <h3 className="mt-2 font-extrabold tracking-tight text-ink">Segurança em primeiro lugar</h3>
            <ul className="mt-2 space-y-1.5 text-xs font-medium leading-relaxed text-ink/60">
              <li>· Nunca partilhes o CVV — nem connosco</li>
              <li>· Congela o cartão connosco em 1 toque se pertas o telemóvel</li>
              <li>· Enviámos SMS em cada operação — confirma sempre</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
