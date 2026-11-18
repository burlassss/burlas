import Link from "next/link";
import { ArrowDownToLine, ChevronDown } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, EmptyState } from "@/components/ui";
import { DepositoAcoes } from "@/components/depositos-admin";
import { ESTADO_DEPOSITO } from "@/lib/labels";
import { formatDataHora } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Depósitos" };

const ABAS = [
  { id: "pendente_analise", label: "Por aprovar" },
  { id: "aprovado", label: "Aprovados" },
  { id: "recusado", label: "Recusados" },
  { id: "", label: "Todos" },
];

export default async function AdminDepositosPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireAdmin();
  const { estado } = await searchParams;
  const filtro = estado && ["pendente_analise", "aprovado", "recusado", "cancelado", "expirado"].includes(estado) ? estado : undefined;
  const mostrarTodos = estado === "todos";
  const depositos = await db.listDeposits({ estado: mostrarTodos ? undefined : filtro ?? "pendente_analise", limit: 100 });
  const utilizadores = await db.listUsers();
  const agentes = await db.listAgents();
  const nomePorId = new Map(utilizadores.map((u) => [u.id, u.nome]));
  const agentePorId = new Map(agentes.map((a) => {
  const dono = utilizadores.find((u) => u.id === a.user_id);
  return [a.id, dono ? `${dono.nome} (${a.operadora === "ambas" ? "M-Pesa+e-Mola" : a.operadora.toUpperCase()})` : "Agente"];
}));

  const ativo = mostrarTodos ? "" : filtro ?? "pendente_analise";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">Fila de depósitos</h1>
          <p className="mt-0.5 text-sm font-medium text-ink/55">O crédito na carteira só acontece após a tua aprovação — nunca antes.</p>
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-black/5 bg-surface p-1.5">
          {ABAS.map((aba) => (
            <Link
              key={aba.id || "todos"}
              href={aba.id ? `/admin/depositos?estado=${aba.id}` : "/admin/depositos?estado=todos"}
              className={`rounded-xl px-3 py-2 text-[0.72rem] font-extrabold transition-colors ${ativo === aba.id ? "bg-forest text-lime" : "text-ink/55 hover:text-ink"}`}
            >
              {aba.label}
            </Link>
          ))}
        </div>
      </div>

      {depositos.length === 0 ? (
        <EmptyState icon={ArrowDownToLine} title="Nada por aqui" description="Nenhum depósito neste estado neste momento." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-black/5 bg-surface shadow-sm">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-[0.62rem] font-extrabold uppercase tracking-wider text-ink/45">
                <th className="px-5 py-3.5">Referência</th>
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Método</th>
                <th className="px-5 py-3.5 text-right">MZN</th>
                <th className="px-5 py-3.5 text-right">Líquido USD</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Criado</th>
                <th className="px-5 py-3.5 text-right">Decisão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {depositos.map((d) => {
                const estadoMeta = ESTADO_DEPOSITO[d.estado];
                return (
                  <tr key={d.id} className="transition-colors hover:bg-sand/30">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-ink/80">{d.referencia}</td>
                    <td className="px-5 py-3.5 font-bold text-ink">{nomePorId.get(d.user_id) ?? "—"}</td>
                    <td className="px-5 py-3.5 text-xs font-extrabold uppercase text-ink/70">{d.metodo === "usdt_trc20" ? "USDT" : d.metodo === "mpesa" ? "M-Pesa" : "e-Mola"}</td>
                    <td className="px-5 py-3.5 text-right font-extrabold tabular-nums text-ink">MT {d.valor_mzn != null ? Number(d.valor_mzn).toFixed(2) : "—"}</td>
                    <td className="px-5 py-3.5 text-right font-extrabold tabular-nums text-forest">${d.valor_liquido_usd != null ? d.valor_liquido_usd.toFixed(2) : "—"}</td>
                    <td className="px-5 py-3.5"><Badge tone={estadoMeta?.tone ?? "zinc"}>{estadoMeta?.label ?? d.estado}</Badge></td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-ink/55">{formatDataHora(d.criado_em)}</td>
                    <td className="px-5 py-3.5">
                      {d.estado === "pendente_analise" ? (
                        <DepositoAcoes deposito={{ id: d.id, referencia: d.referencia, valor_mzn: d.valor_mzn, valor_liquido_usd: d.valor_liquido_usd, metodo: d.metodo, codigo_tx: d.codigo_tx, criado_em: d.criado_em, utilizador_nome: nomePorId.get(d.user_id), agente_nome: d.agent_id ? agentePorId.get(d.agent_id) : d.metodo === "usdt_trc20" ? "TRC20 (automático)" : null }} />
                      ) : (
                        <span className="block text-right text-[0.68rem] font-bold text-ink/40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <details className="group rounded-2xl border border-black/5 bg-surface p-4 text-xs text-ink/60">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-extrabold uppercase tracking-wider text-ink/50"><ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /> Como funciona a aprovação</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 font-medium leading-relaxed">
          <li>Depósitos USDT confirmados pelo NOWPayments (IPN) são creditados automaticamente; aparece aqui como <em>aprovado</em>.</li>
          <li>Depósitos M-Pesa/e-Mola só aparecem em <em>Por aprovar</em> depois de o agente confirmar a receção do dinheiro.</li>
          <li>Ao aprovar, o valor líquido é lançado no ledger e o cliente recebe SMS + notificação. Recusar também notifica.</li>
        </ul>
      </details>
    </div>
  );
}
