import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, EmptyState } from "@/components/ui";
import { LevantamentoEstorno } from "@/components/depositos-admin";
import { ESTADO_LEVANTAMENTO, METODO_LABEL } from "@/lib/labels";
import { formatDataHora } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Levantamentos" };

const ABAS = [
  { id: "", label: "Em curso" },
  { id: "concluida", label: "Concluídos" },
  { id: "cancelada", label: "Estornados" },
  { id: "todos", label: "Todos" },
];

export default async function AdminLevantamentosPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireAdmin();
  const { estado } = await searchParams;
  const levantamentos = await db.listWithdrawals({});
  const utilizadores = await db.listUsers();
  const agentes = await db.listAgents();
  const nomePorId = new Map(utilizadores.map((u) => [u.id, u.nome]));
  const agentePorId = new Map(agentes.map((a) => {
  const dono = utilizadores.find((u) => u.id === a.user_id);
  return [a.id, dono ? `${dono.nome} (${a.operadora === "ambas" ? "M-Pesa+e-Mola" : a.operadora.toUpperCase()})` : "Agente"];
}));

  const emCurso = ["criada", "aguardando_agente", "atribuida", "em_processamento", "enviada", "aguardando_confirmacao"];
  let lista = levantamentos;
  if (estado === "concluida") lista = levantamentos.filter((w) => w.estado === "concluida");
  else if (estado === "cancelada") lista = levantamentos.filter((w) => w.estado === "cancelada");
  else if (estado !== "todos") lista = levantamentos.filter((w) => emCurso.includes(w.estado));
  lista = [...lista].sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));

  const ativo = estado ?? "";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">Levantamentos</h1>
          <p className="mt-0.5 text-sm font-medium text-ink/55">Acompanha cada levantamento e estorna quando o agente não consegue executar.</p>
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-black/5 bg-surface p-1.5">
          {ABAS.map((aba) => (
            <Link key={aba.id || "curso"} href={`/admin/levantamentos${aba.id ? `?estado=${aba.id}` : ""}`} className={`rounded-xl px-3 py-2 text-[0.72rem] font-extrabold transition-colors ${ativo === aba.id ? "bg-forest text-lime" : "text-ink/55 hover:text-ink"}`}>{aba.label}</Link>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <EmptyState icon={<ArrowUpRight className="h-6 w-6 text-forest" />} title="Nada por aqui" description="Nenhum levantamento neste filtro." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-black/5 bg-surface shadow-sm">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-[0.62rem] font-extrabold uppercase tracking-wider text-ink/45">
                <th className="px-5 py-3.5">Referência</th>
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Destino</th>
                <th className="px-5 py-3.5 text-right">Valor USD</th>
                <th className="px-5 py-3.5 text-right">Destino MZN</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Agente</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {lista.map((w) => {
                const estadoMeta = ESTADO_LEVANTAMENTO[w.estado];
                return (
                  <tr key={w.id} className="transition-colors hover:bg-sand/30">
                    <td className="px-5 py-3.5"><span className="font-mono text-xs font-bold text-ink/80">{w.referencia}</span><span className="mt-0.5 block text-[0.62rem] font-semibold text-ink/45">{formatDataHora(w.criado_em)}</span></td>
                    <td className="px-5 py-3.5 font-bold text-ink">{nomePorId.get(w.user_id) ?? "—"}</td>
                    <td className="px-5 py-3.5 text-xs font-bold text-ink/70"><span className="uppercase">{METODO_LABEL[w.metodo] ?? w.metodo}</span> · <span className="font-normal">{w.destino}</span></td>
                    <td className="px-5 py-3.5 text-right font-extrabold tabular-nums">${Number(w.valor_usd).toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-right font-extrabold tabular-nums">MT {Number(w.valor_liquido_mzn).toFixed(2)}</td>
                    <td className="px-5 py-3.5"><Badge tone={estadoMeta?.tone ?? "zinc"}>{estadoMeta?.label ?? w.estado}</Badge></td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-ink/60">{w.agent_id ? agentePorId.get(w.agent_id) ?? "—" : "—"}</td>
                    <td className="px-5 py-3.5 text-right">
                      {["criada", "aguardando_agente", "atribuida", "em_processamento", "enviada", "aguardando_confirmacao"].includes(w.estado) && (
                        <LevantamentoEstorno id={w.id} referencia={w.referencia} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
