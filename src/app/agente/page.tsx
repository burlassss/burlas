import { requireAgente } from "@/lib/auth";
import { db } from "@/lib/db";
import { AgentePanel, type OrdemView, type AgenteStats } from "@/components/agente-panel";
import { AgenteCandidatura } from "@/components/agente-candidatura";
import { toCents } from "@/lib/money";
import { AgenteMetodosForm } from "@/components/agente-metodos-form";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Painel de Agente" };

export default async function AgentePage() {
  const user = await requireAgente();
  const agente = await db.findAgentByUserId(user.id);

  if (!agente) {
    return <AgenteCandidatura />;
  }

  // Estatísticas
  const [ordensDepositoAprovados, levantamentosConcluidos, todasOrdens] = await Promise.all([
    db.listDeposits({ agenteId: agente.id, estado: "aprovado" }),
    db.listWithdrawals({ agenteId: agente.id, estado: "concluida" }),
    db.listOrders({ agentId: agente.id, limit: 100 }),
  ]);

  const comissoesDeposito = ordensDepositoAprovados.reduce((acc, d) => acc + toCents(d.comissao ?? 0), 0);
  const comissoesLevantamento = levantamentosConcluidos.reduce((acc, w) => acc + toCents(w.comissao ?? 0), 0);
  const concluidas = todasOrdens.filter((o) => o.estado === "concluida").length;
  const total = todasOrdens.length;
  const stats: AgenteStats = {
    comissoesCents: comissoesDeposito + comissoesLevantamento,
    taxaConclusao: total > 0 ? (concluidas / total) * 100 : 100,
    totalOperacoes: Math.max(total, agente.total_operacoes),
    concluidas: Math.max(concluidas, agente.operacoes_concluidas),
    avaliacao: agente.avaliacao_media,
    limiteDiario: agente.limite_diario,
    disponivel: agente.disponivel,
    estado: agente.estado,
  };

  // Ordens pendentes/em curso com detalhes
  const ordensAbertas = (await db.listOrders({ agentId: agente.id })).filter((o) => ["pendente", "aceite"].includes(o.estado));
  const pendentes: OrdemView[] = await Promise.all(
    ordensAbertas.map(async (o) => {
      if (o.tipo === "deposito") {
        const d = await db.findDeposit(o.referencia_id);
        return {
          id: o.id, tipo: o.tipo, estado: o.estado, expira_em: o.expira_em, criado_em: o.criado_em,
          deposito: d ? { id: d.id, referencia: d.referencia, valor_mzn: d.valor_mzn, valor_liquido_usd: d.valor_liquido_usd, metodo: d.metodo, codigo_tx: d.codigo_tx, estado: d.estado } : null,
        };
      }
      const w = await db.findWithdrawal(o.referencia_id);
      return {
        id: o.id, tipo: o.tipo, estado: o.estado, expira_em: o.expira_em, criado_em: o.criado_em,
        levantamento: w ? { id: w.id, referencia: w.referencia, valor_liquido_mzn: w.valor_liquido_mzn, metodo: w.metodo, destino: w.destino } : null,
      };
    }),
  );

  const historico: OrdemView[] = await Promise.all(
    todasOrdens
      .filter((o) => ["concluida", "cancelada", "recusada", "expirada"].includes(o.estado))
      .slice(0, 10)
      .map(async (o) => {
        if (o.tipo === "deposito") {
          const d = await db.findDeposit(o.referencia_id);
          return { id: o.id, tipo: o.tipo, estado: o.estado, expira_em: o.expira_em, criado_em: o.criado_em, deposito: d ? { id: d.id, referencia: d.referencia, valor_mzn: d.valor_mzn, valor_liquido_usd: d.valor_liquido_usd, metodo: d.metodo, codigo_tx: d.codigo_tx, estado: d.estado } : null };
        }
        const w = await db.findWithdrawal(o.referencia_id);
        return { id: o.id, tipo: o.tipo, estado: o.estado, expira_em: o.expira_em, criado_em: o.criado_em, levantamento: w ? { id: w.id, referencia: w.referencia, valor_liquido_mzn: w.valor_liquido_mzn, metodo: w.metodo, destino: w.destino } : null };
      }),
  );

  return <div className="flex flex-col gap-5"><AgenteMetodosForm operadoraInicial={agente.operadora} mpesaInicial={agente.telefone_mpesa} emolaInicial={agente.telefone_emola} /><AgentePanel stats={stats} pendentes={pendentes} historico={historico} /></div>;
}
