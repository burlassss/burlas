import Link from "next/link";
import { Store, Star, Clock } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, EmptyState } from "@/components/ui";
import { AgenteAcoes } from "@/components/agente-admin";
import { ESTADO_AGENTE } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agentes" };

const ABAS = [
  { id: "pendente", label: "Candidaturas" },
  { id: "ativo", label: "Ativos" },
  { id: "suspenso", label: "Suspensos" },
  { id: "", label: "Todos" },
];

const OPERADORA_LABEL: Record<string, string> = { mpesa: "M-Pesa", emola: "e-Mola", ambas: "M-Pesa + e-Mola" };

export default async function AdminAgentesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireAdmin();
  const { estado } = await searchParams;
  const filtro = estado && ["pendente", "ativo", "suspenso", "inativo"].includes(estado) ? estado : undefined;
  const agentes = await db.listAgents(filtro ? { estado: filtro } : undefined);
  const utilizadores = await db.listUsers();
  const utilizadorPorId = new Map(utilizadores.map((u) => [u.id, u]));
  const ativo = filtro ?? "";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">Rede de agentes</h1>
          <p className="mt-0.5 text-sm font-medium text-ink/55">Aprova candidaturas, define comissões e supervisiona o desempenho.</p>
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-black/5 bg-surface p-1.5">
          {ABAS.map((aba) => (
            <Link key={aba.id || "todos"} href={`/admin/agentes${aba.id ? `?estado=${aba.id}` : ""}`} className={cn("rounded-xl px-3 py-2 text-[0.72rem] font-extrabold transition-colors", ativo === aba.id ? "bg-forest text-lime" : "text-ink/55 hover:text-ink")}>{aba.label}</Link>
          ))}
        </div>
      </div>

      {agentes.length === 0 ? (
        <EmptyState icon={Store} title="Nenhum agente" description="Ainda não há agentes neste filtro. Novas candidaturas aparecem em “Candidaturas”." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {agentes.map((a) => {
            const estadoMeta = ESTADO_AGENTE[a.estado];
            const user = utilizadorPorId.get(a.user_id);
            const taxa = a.total_operacoes > 0 ? Math.round((a.operacoes_concluidas / a.total_operacoes) * 100) : 100;
            const iniciais = (user?.nome ?? "AG").split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
            return (
              <article key={a.id} className="flex flex-col rounded-3xl border border-black/5 bg-surface p-5 shadow-sm">
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
                    {a.disponivel && a.estado === "ativo" && <span className="flex items-center gap-1 text-[0.62rem] font-extrabold uppercase tracking-wider text-forest"><span className="h-2 w-2 rounded-full bg-lime-strong" />Disponível</span>}
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-[0.7rem] font-semibold text-ink/70 sm:grid-cols-4">
                  <div className="rounded-xl bg-sand/60 px-3 py-2"><dt className="text-[0.55rem] font-extrabold uppercase text-ink/45">Comissão</dt><dd className="text-sm font-extrabold text-forest">{a.comissao_pct}%</dd></div>
                  <div className="rounded-xl bg-sand/60 px-3 py-2"><dt className="text-[0.55rem] font-extrabold uppercase text-ink/45">Limite diário</dt><dd className="text-sm font-extrabold tabular-nums">MT {Number(a.limite_diario).toFixed(0)}</dd></div>
                  <div className="rounded-xl bg-sand/60 px-3 py-2"><dt className="flex items-center gap-1 text-[0.55rem] font-extrabold uppercase text-ink/45"><Star className="h-3 w-3" />Avaliação</dt><dd className="text-sm font-extrabold">{Number(a.avaliacao_media).toFixed(1)}</dd></div>
                  <div className="rounded-xl bg-sand/60 px-3 py-2"><dt className="flex items-center gap-1 text-[0.55rem] font-extrabold uppercase text-ink/45"><Clock className="h-3 w-3" />Conclusão</dt><dd className="text-sm font-extrabold">{taxa}% <span className="text-[0.6rem] font-bold text-ink/40">({a.operacoes_concluidas}/{a.total_operacoes})</span></dd></div>
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
