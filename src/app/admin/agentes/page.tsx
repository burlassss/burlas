import Link from "next/link";
import { Store, Star, Clock, UserRoundSearch, Users, Zap, CheckCircle2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, EmptyState } from "@/components/ui";
import { AgenteAcoes } from "@/components/agente-admin";
import { ESTADO_AGENTE } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agentes" };

const ABAS = [
  { id: "", label: "Todos" },
  { id: "pendente", label: "Candidaturas" },
  { id: "ativo", label: "Ativos" },
  { id: "suspenso", label: "Suspensos" },
] as const;

const OPERADORA_LABEL: Record<string, string> = { mpesa: "M-Pesa", emola: "e-Mola", ambas: "M-Pesa + e-Mola" };

export default async function AdminAgentesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireAdmin();
  const { estado } = await searchParams;
  const filtro = estado && ["pendente", "ativo", "suspenso", "inativo"].includes(estado) ? estado : undefined;

  const [todos, utilizadores] = await Promise.all([db.listAgents(), db.listUsers()]);
  const utilizadorPorId = new Map(utilizadores.map((u) => [u.id, u]));
  const agentes = filtro ? todos.filter((a) => a.estado === filtro) : todos;

  const ativos = todos.filter((a) => a.estado === "ativo");
  const pendentes = todos.filter((a) => a.estado === "pendente");
  const disponiveis = ativos.filter((a) => a.disponivel);
  const opsConcluidas = todos.reduce((acc, a) => acc + a.operacoes_concluidas, 0);
  const avaliacaoMedia = ativos.length
    ? ativos.reduce((acc, a) => acc + Number(a.avaliacao_media), 0) / ativos.filter((a) => a.avaliacao_media > 0).length || 0
    : 0;

  const ativo = filtro ?? "";
  const stats = [
    { label: "Agentes ativos", valor: String(ativos.length), icon: Users },
    { label: "Disponíveis agora", valor: String(disponiveis.length), icon: Zap },
    { label: "Candidaturas pendentes", valor: String(pendentes.length), icon: UserRoundSearch, destaque: pendentes.length > 0 },
    { label: "Operações concluídas", valor: String(opsConcluidas), icon: CheckCircle2 },
    { label: "Avaliação média", valor: avaliacaoMedia > 0 ? avaliacaoMedia.toFixed(1) : "—", icon: Star },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">Rede de agentes</h1>
          <p className="mt-0.5 text-sm font-medium text-ink/55">Aprova candidaturas, define comissões e supervisiona o desempenho.</p>
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-black/5 bg-surface p-1.5">
          {ABAS.map((aba) => (
            <Link
              key={aba.id || "todos"}
              href={`/admin/agentes${aba.id ? `?estado=${aba.id}` : ""}`}
              className={cn(
                "relative rounded-xl px-3 py-2 text-[0.72rem] font-extrabold transition-colors",
                ativo === aba.id ? "bg-forest text-lime" : "text-ink/55 hover:text-ink",
              )}
            >
              {aba.label}
              {aba.id === "pendente" && pendentes.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[0.58rem] font-extrabold text-white">{pendentes.length}</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Resumo da rede */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className={cn("flex items-center gap-3 rounded-2xl border p-3", s.destaque ? "border-amber-300 bg-amber-50" : "border-black/5 bg-surface")}>
            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", s.destaque ? "bg-amber-200/60 text-amber-800" : "bg-sand text-forest")}>
              <s.icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.52rem] font-extrabold uppercase leading-tight tracking-wider text-ink/50">{s.label}</span>
              <span className="mt-0.5 block text-lg font-extrabold leading-none tabular-nums text-ink">{s.valor}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Candidaturas em destaque */}
      {(filtro === undefined || filtro === "pendente") && pendentes.length > 0 && (
        <section className="rounded-3xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-amber-800"><UserRoundSearch className="h-4 w-4" /> Candidaturas à espera de decisão</h2>
          <ul className="mt-3 divide-y divide-amber-200">
            {pendentes.map((a) => {
              const user = utilizadorPorId.get(a.user_id);
              const iniciais = (user?.nome ?? "AG").split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-200/70 text-sm font-black text-amber-900">{iniciais}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-amber-950">{user?.nome ?? "Agente"} · <span className="font-bold">{OPERADORA_LABEL[a.operadora] ?? a.operadora}</span></p>
                    <p className="text-[0.68rem] font-semibold text-amber-900/80">{user?.telefone ?? ""} · limite MT {Number(a.limite_diario).toFixed(0)}/dia · pediu {a.comissao_pct}%</p>
                  </div>
                  <AgenteAcoes id={a.id} nome={user?.nome ?? "Agente"} estado={a.estado} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Lista de agentes */}
      {agentes.length === 0 ? (
        <EmptyState icon={<Store className="h-6 w-6 text-forest" />} title="Nenhum agente neste filtro" description={filtro === "pendente" ? "Sem candidaturas a aguardar. Novas candidaturas aparecem aqui." : "Sem agentes neste estado."} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {agentes.filter((a) => !(filtro === undefined && a.estado === "pendente")).map((a) => {
            const estadoMeta = ESTADO_AGENTE[a.estado];
            const user = utilizadorPorId.get(a.user_id);
            const taxa = a.total_operacoes > 0 ? Math.round((a.operacoes_concluidas / a.total_operacoes) * 100) : 100;
            const iniciais = (user?.nome ?? "AG").split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
            return (
              <article key={a.id} className="flex flex-col rounded-3xl border border-black/5 bg-surface p-5 shadow-sm transition-shadow hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime-soft font-extrabold text-forest">{iniciais}</span>
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-ink">{user?.nome ?? "Agente"}</p>
                      <p className="text-[0.68rem] font-semibold text-ink/50">{a.localizacao ?? "Localização não indicada"} · {user?.telefone ?? ""}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={estadoMeta?.tone ?? "zinc"}>{estadoMeta?.label ?? a.estado}</Badge>
                    {a.disponivel && a.estado === "ativo" && <span className="flex items-center gap-1 text-[0.6rem] font-extrabold uppercase tracking-wider text-forest"><span className="h-2 w-2 rounded-full bg-lime-strong" />Disponível</span>}
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-[0.7rem] font-semibold text-ink/70 sm:grid-cols-4">
                  <div className="rounded-xl bg-sand/60 px-3 py-2"><dt className="text-[0.52rem] font-extrabold uppercase text-ink/45">Comissão</dt><dd className="text-sm font-extrabold text-forest">{a.comissao_pct}%</dd></div>
                  <div className="rounded-xl bg-sand/60 px-3 py-2"><dt className="text-[0.52rem] font-extrabold uppercase text-ink/45">Limite diário</dt><dd className="text-sm font-extrabold tabular-nums">MT {Number(a.limite_diario).toFixed(0)}</dd></div>
                  <div className="rounded-xl bg-sand/60 px-3 py-2"><dt className="flex items-center gap-1 text-[0.52rem] font-extrabold uppercase text-ink/45"><Star className="h-3 w-3" />Avaliação</dt><dd className="text-sm font-extrabold">{a.avaliacao_media > 0 ? Number(a.avaliacao_media).toFixed(1) : "—"}</dd></div>
                  <div className="rounded-xl bg-sand/60 px-3 py-2"><dt className="flex items-center gap-1 text-[0.52rem] font-extrabold uppercase text-ink/45"><Clock className="h-3 w-3" />Conclusão</dt><dd className="text-sm font-extrabold">{taxa}% <span className="text-[0.6rem] font-bold text-ink/40">({a.operacoes_concluidas}/{a.total_operacoes})</span></dd></div>
                </dl>
                <p className="mt-3 text-[0.72rem] font-semibold text-ink/55"><span className="font-extrabold text-ink/75">Opera por:</span> {OPERADORA_LABEL[a.operadora] ?? a.operadora} · Resposta média ~{a.tempo_resposta_min} min</p>
                <div className="mt-4 border-t border-black/5 pt-4">
                  <AgenteAcoes id={a.id} nome={user?.nome ?? "Agente"} estado={a.estado} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
