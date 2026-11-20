import Link from "next/link";
import {
  Users, CreditCard, ArrowDownToLine, ArrowUpRight, Smartphone, Bitcoin, BadgePercent,
  AlertTriangle, Scale, ChevronRight, ScrollText,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoeda } from "@/lib/money";
import { TempoRelativo } from "@/components/tempo-relativo";
import { VolumeChart } from "@/components/admin-charts";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();
  const stats = await db.adminStats();
  const auditoria = await db.listAudit(6);

  const kpis = [
    { label: "Utilizadores ativos", valor: String(stats.utilizadoresAtivos), hint: `${stats.totalUtilizadores} registados`, icon: Users },
    { label: "Cartões emitidos", valor: String(stats.cartoesEmitidos), hint: `${stats.cartoesAtivos} ativos`, icon: CreditCard },
    { label: "Total depositado", valor: formatMoeda(stats.totalDepositadoCents), hint: "desde o início", icon: ArrowDownToLine },
    { label: "Total levantado", valor: formatMoeda(stats.totalLevantadoCents), hint: "operações concluídas", icon: ArrowUpRight },
    { label: "Volume M-Pesa", valor: formatMoeda(stats.volumeMpesaCents), hint: "depósitos aprovados", icon: Smartphone },
    { label: "Volume e-Mola", valor: formatMoeda(stats.volumeEmolaCents), hint: "depósitos aprovados", icon: Smartphone },
    { label: "Volume cripto (USDT)", valor: formatMoeda(stats.volumeCriptoCents), hint: "TRC20 confirmado", icon: Bitcoin },
    { label: "Comissões e taxas", valor: formatMoeda(stats.comissoesCents), hint: "receita acumulada", icon: BadgePercent },
  ];

  const pendencias = [
    { href: "/admin/depositos", label: "Depósitos por aprovar", valor: stats.depositosPendentes, tom: "amber" },
    { href: "/admin/levantamentos", label: "Levantamentos pendentes", valor: stats.levantamentosPendentes, tom: "amber" },
    { href: "/admin/disputas", label: "Disputas abertas", valor: stats.disputasAbertas, tom: "red" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest sm:text-3xl">Visão geral</h1>
          <p className="mt-0.5 text-sm font-medium text-ink/55">Saúde da plataforma em tempo real · atualizado agora</p>
        </div>
        <Link href="/admin/integracoes" className="text-xs font-extrabold text-forest underline underline-offset-4">Ver estado das integrações →</Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-black/5 bg-surface p-4">
            <kpi.icon className="h-5 w-5 text-forest" strokeWidth={1.8} />
            <p className="mt-2 text-[0.58rem] font-extrabold uppercase tracking-wider text-ink/50">{kpi.label}</p>
            <p className="mt-0.5 text-xl font-extrabold tracking-tight text-ink">{kpi.valor}</p>
            <p className="text-[0.62rem] font-semibold text-ink/45">{kpi.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Gráfico */}
        <section className="rounded-3xl border border-black/5 bg-surface p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold tracking-tight text-ink">Volume de depósitos · 14 dias</h2>
            <span className="rounded-full bg-lime-soft px-3 py-1 text-[0.62rem] font-extrabold uppercase tracking-wider text-forest">Ledger</span>
          </div>
          <div className="mt-4">
            <VolumeChart dados={stats.volumeDiario} />
          </div>
        </section>

        {/* Pendências */}
        <aside className="flex flex-col gap-3">
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.16em] text-amber-800"><AlertTriangle className="h-4 w-4" /> Precisa de atenção</h2>
            <ul className="mt-3 divide-y divide-amber-200/60">
              {pendencias.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm font-bold text-amber-900">{p.label}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-600 px-2 text-[0.68rem] font-extrabold text-white">{p.valor}</span>
                      <ChevronRight className="h-4 w-4 text-amber-700" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Auditoria recente */}
          <section className="flex-1 rounded-3xl border border-black/5 bg-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.16em] text-ink/55"><ScrollText className="h-4 w-4" /> Auditoria recente</h2>
            <ul className="mt-3 space-y-2.5">
              {auditoria.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 text-xs">
                  <span className="min-w-0">
                    <span className="block font-bold text-ink">{a.acao}</span>
                    <span className="block font-medium text-ink/45">{a.entidade}{a.entidade_id ? ` · ${String(a.entidade_id).slice(0, 8)}…` : ""}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-ink/40"><TempoRelativo iso={a.criado_em} /></span>
                </li>
              ))}
              {auditoria.length === 0 && <li className="text-ink/45">Sem registos ainda.</li>}
            </ul>
            <Link href="/admin/auditoria" className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-forest hover:text-moss">Ver auditoria completa <ChevronRight className="h-3.5 w-3.5" /></Link>
          </section>
        </aside>
      </div>

      {/* Agentes ativos + disputas */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-black/5 bg-pine px-6 py-5 text-cream">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime/15"><Scale className="h-6 w-6 text-lime" /></span>
          <div>
            <p className="font-extrabold">{stats.agentesAtivos} agentes ativos na rede</p>
            <p className="text-xs font-medium text-cream/60">Distribuição automática por desempenho e capacidade</p>
          </div>
        </div>
        <Link href="/admin/agentes" className="rounded-full bg-lime px-5 py-2.5 text-xs font-extrabold text-pine hover:bg-lime-strong">Gerir agentes</Link>
      </div>
    </div>
  );
}
