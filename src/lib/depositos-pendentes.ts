import type { Deposit } from "./db/types";

// Só mostrar no painel quando o cliente já submeteu o código de transferência.
// Pedidos recém-criados (aguardando_pagamento) ainda não significam que o cliente enviou dinheiro.
const ESTADOS_PENDENTES = new Set(["aguardando_confirmacoes", "pendente_analise"]);

/** Resumo dos depósitos do cliente para destacar no painel (a caminho / recém-creditados). */
export function resumirDepositos(depositos: Deposit[]) {
  const pendentes = depositos.filter((d) => ESTADOS_PENDENTES.has(d.estado));
  const limite48h = Date.now() - 48 * 60 * 60 * 1000;
  const recemAprovado =
    depositos.find((d) => d.estado === "aprovado" && d.decidido_em && new Date(d.decidido_em).getTime() >= limite48h) ?? null;
  return { pendentePrincipal: pendentes[0] ?? null, totalPendentes: pendentes.length, recemAprovado };
}
