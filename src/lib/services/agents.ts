import { db } from "../db";
import type { Agent } from "../db/types";

/**
 * Distribuição de ordens a agentes — rodízio ponderado por:
 *   · taxa histórica de conclusão (50%)
 *   · avaliação média do agente (30%)
 *   · velocidade de resposta (20%)
 * multiplicado pela capacidade disponível (limite diário menos o já comprometido em 24h),
 * com penalização por ordens pendentes para espalhar a carga.
 */
export async function selecionarAgente(operadora: "mpesa" | "emola"): Promise<Agent | null> {
  const agentes = await db.listAgents({ estado: "ativo" });
  const elegiveis = agentes.filter(
    (a) => a.disponivel && (a.operadora === "ambas" || a.operadora === operadora),
  );
  if (elegiveis.length === 0) return null;

  const desde24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const pontuados = await Promise.all(
    elegiveis.map(async (a) => {
      const ordens = await db.listOrders({ agentId: a.id });
      const pendentes = ordens.filter((o) => o.estado === "pendente").length;
      const doDia = ordens.filter((o) => o.criado_em >= desde24h).length;

      const conclusao = a.total_operacoes > 0 ? a.operacoes_concluidas / a.total_operacoes : 0.9;
      const avaliacao = Math.max(0, Math.min(1, a.avaliacao_media / 5));
      const resposta = Math.max(0.2, Math.min(1, 10 / Math.max(a.tempo_resposta_min, 1)));
      const capacidade = Math.max(0.05, 1 - doDia / Math.max(a.limite_diario / 50, 1));

      const peso = (0.5 * conclusao + 0.3 * avaliacao + 0.2 * resposta) * capacidade * Math.pow(0.7, pendentes);
      return { agente: a, peso };
    }),
  );

  pontuados.sort((a, b) => b.peso - a.peso);
  return pontuados[0]?.agente ?? null;
}
