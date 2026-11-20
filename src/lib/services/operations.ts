import { db } from "../db";
import { criarPagamentoUsdt } from "../integrations/nowpayments";
import type { Agent, Deposit, DepositoMetodo, LevantamentoMetodo, User, Withdrawal } from "../db/types";
import { centsToDb, fromCents, referencia as novaReferencia, toCents } from "../money";
import { cotacao, mznParaUsd, usdParaMzn } from "./fx";
import { getFee } from "./fees";
import { selecionarAgente } from "./agents";
import { notificar } from "./notify";
import { pingCliente } from "../realtime";

/* ────────────────────────────────────────────────────────────
 * DEPÓSITOS
 * ──────────────────────────────────────────────────────────── */

/** Cria um pedido de depósito USDT TRC20 (aguarda pagamento on-chain). */
export async function criarDepositoUsdt(user: User, valorUsdCents: number): Promise<Deposit> {
  const taxaPct = await getFee("deposito_usdt_pct", 0.5);
  const taxaCents = Math.round((valorUsdCents * taxaPct) / 100);
  const liquido = valorUsdCents - taxaCents;
  const referencia = novaReferencia("DEP-T");

  const pagamento = await criarPagamentoUsdt({ valorUsd: fromCents(valorUsdCents), referencia });
  const deposit = await db.insertDeposit({
    user_id: user.id,
    metodo: "usdt_trc20",
    valor_mzn: null,
    valor_usd: fromCents(valorUsdCents),
    valor_liquido_usd: fromCents(liquido),
    codigo_tx: null,
    rate_id: null,
    comissao: 0,
    taxa: fromCents(taxaCents),
    agent_id: null,
    estado: "aguardando_pagamento",
    motivo_recusa: null,
    referencia,
    provedor_ref: pagamento.provedorRef,
    endereco_pagamento: pagamento.endereco,
  });

  await db.insertAudit({ ator: user.id, acao: "deposito.criado", entidade: "deposits", entidade_id: deposit.id, dados: { metodo: "usdt_trc20", valor: fromCents(valorUsdCents) } });
  await notificar(user.id, { tipo: "deposito_recebido", titulo: "Aguardando pagamento", corpo: `Pedido de depósito de $${fromCents(valorUsdCents).toFixed(2)} criado. Envia USDT TRC20 para o endereço indicado dentro de 60 minutos.` });
  return deposit;
}

/**
 * Confirma o pagamento de um depósito USDT (chamado pelo webhook NOWPayments
 * ou pela simulação em modo demo). Idempotente — crédito apenas uma vez.
 */
export async function confirmarDepositoUsdt(provedorRefOuDeposito: { provedorRef?: string; depositoId?: string }): Promise<Deposit | null> {
  let deposit: Deposit | null = null;
  if (provedorRefOuDeposito.depositoId) deposit = await db.findDeposit(provedorRefOuDeposito.depositoId);
  else if (provedorRefOuDeposito.provedorRef) deposit = await db.findDepositByProvedorRef(provedorRefOuDeposito.provedorRef);
  if (!deposit) return null;
  if (deposit.estado === "aprovado") return deposit; // idempotente

  const credito = toCents(deposit.valor_liquido_usd ?? deposit.valor_usd);
  // Ledger com referência única → nunca credita a dobrar
  await db.applyLedger({
    userId: deposit.user_id,
    tipo: "deposito",
    valorCents: credito,
    moeda: "USD",
    referencia: `CR-${deposit.referencia}`,
    descricao: "Depósito USDT TRC20 confirmado",
  });

  const atualizado = await db.updateDeposit(deposit.id, { estado: "aprovado", decidido_em: new Date().toISOString() });
  const user = await db.findUserById(deposit.user_id);
  await notificar(deposit.user_id, {
    tipo: "deposito_aprovado",
    titulo: "Depósito aprovado",
    corpo: `Recebemos ${usdtFormat(credito)} na tua carteira (ref. ${deposit.referencia}).`,
    telefone: user?.telefone,
  });
  await db.insertAudit({ ator: null, acao: "deposito.aprovado", entidade: "deposits", entidade_id: deposit.id, dados: { metodo: "usdt_trc20", valor_liquido: fromCents(credito) } });
  return atualizado;
}

const usdtFormat = (cents: number) => `$${fromCents(cents).toFixed(2)}`;

export interface CotacaoDeposito {
  taxaBase: number;
  taxaEfetiva: number;
  margemPct: number;
  valorUsdCents: number;
  taxaDepositoCents: number;
  valorLiquidoCents: number;
  taxaPct: number;
  comissaoAgenteCents: number;
}

/** Pré-visualização de um depósito M-Pesa/e-Mola: conversão, taxas e valores líquidos. */
export async function cotarDepositoMobile(metodo: "mpesa" | "emola", valorMznCents: number): Promise<CotacaoDeposito> {
  const cx = await cotacao("USD/MZN");
  const taxaPct = await getFee(metodo === "mpesa" ? "deposito_mpesa_pct" : "deposito_emola_pct", 1.5);
  const comissaoPct = await getFee("comissao_agente_pct", 1.0);
  const brutoUsd = mznParaUsd(valorMznCents, cx.valorEfetivo);
  const taxaDep = Math.round((brutoUsd * taxaPct) / 100);
  const liquido = brutoUsd - taxaDep;
  return {
    taxaBase: cx.valor,
    taxaEfetiva: cx.valorEfetivo,
    margemPct: cx.margemPct,
    valorUsdCents: brutoUsd,
    taxaDepositoCents: taxaDep,
    valorLiquidoCents: liquido,
    taxaPct,
    comissaoAgenteCents: Math.round((brutoUsd * comissaoPct) / 100),
  };
}

/** Cria um pedido de depósito via M-Pesa/e-Mola com agente atribuído. */
export async function criarDepositoMobile(
  user: User,
  metodo: "mpesa" | "emola",
  valorMznCents: number,
): Promise<{ deposit: Deposit; agente: Agent | null; cotacao: CotacaoDeposito }> {
  const q = await cotarDepositoMobile(metodo, valorMznCents);
  const cx = await cotacao("USD/MZN");
  const agente = await selecionarAgente(metodo);
  const referencia = novaReferencia(metodo === "mpesa" ? "DEP-M" : "DEP-E");

  const deposit = await db.insertDeposit({
    user_id: user.id,
    metodo,
    valor_mzn: fromCents(valorMznCents),
    valor_usd: fromCents(q.valorUsdCents),
    valor_liquido_usd: fromCents(q.valorLiquidoCents),
    codigo_tx: null,
    rate_id: cx.rateId,
    comissao: fromCents(q.comissaoAgenteCents),
    taxa: fromCents(q.taxaDepositoCents),
    agent_id: agente?.id ?? null,
    estado: "aguardando_pagamento",
    motivo_recusa: null,
    referencia,
    provedor_ref: null,
    endereco_pagamento: null,
  });

  if (agente) {
    await db.insertOrder({
      agent_id: agente.id,
      tipo: "deposito",
      referencia_id: deposit.id,
      estado: "pendente",
      expira_em: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
    const agenteUser = await db.findUserById(agente.user_id);
    if (agenteUser) {
      await notificar(agenteUser.id, {
        tipo: "nova_ordem_agente",
        titulo: "Nova ordem de depósito",
        corpo: `Tens 15 minutos para aceitar a ordem de depósito ${referencia} (${metodo.toUpperCase()}).`,
        telefone: agenteUser.telefone,
      });
    }
  }

  await db.insertAudit({ ator: user.id, acao: "deposito.criado", entidade: "deposits", entidade_id: deposit.id, dados: { metodo, valor_mzn: fromCents(valorMznCents), agente: agente?.id ?? null } });
  return { deposit, agente, cotacao: q };
}

/** Cliente introduz o código da transação → passa a “pendente de análise”. */
export async function submeterCodigoDeposito(user: User, depositoId: string, codigo: string): Promise<{ ok: boolean; erro?: string; deposit?: Deposit }> {
  const deposit = await db.findDeposit(depositoId);
  if (!deposit || deposit.user_id !== user.id) return { ok: false, erro: "Depósito não encontrado." };
  if (!/^[A-Za-z0-9-]{5,32}$/.test(codigo)) return { ok: false, erro: "Código de transação inválido. Verifica o SMS/USSD da tua carteira móvel." };

  // Mesmo código não pode ser reutilizado noutro depósito
  const reuso = await db.findDepositByTxCode(codigo);
  if (reuso && reuso.id !== deposit.id) return { ok: false, erro: "Este código de transação já foi utilizado noutro depósito." };

  const atualizado = await db.updateDeposit(deposit.id, { codigo_tx: codigo.toUpperCase(), estado: "pendente_analise" });
  await notificar(user.id, { tipo: "deposito_recebido", titulo: "Em análise", corpo: `Recebemos o teu código ${codigo.toUpperCase()}. O agente e a equipa MOZOUT vão confirmar o recebimento.` });
  return { ok: true, deposit: atualizado! };
}

/** Agente confirma o recebimento da transferência. */
export async function agenteConfirmarDeposito(agente: Agent, depositoId: string, nota?: string): Promise<{ ok: boolean; erro?: string }> {
  const deposit = await db.findDeposit(depositoId);
  if (!deposit || deposit.agent_id !== agente.id) return { ok: false, erro: "Operação não encontrada." };
  const ordens = await db.listOrders({ agentId: agente.id, tipo: "deposito" });
  const ordem = ordens.find((o) => o.referencia_id === depositoId && ["pendente", "aceite"].includes(o.estado));
  if (ordem && ordem.estado === "pendente") {
    await db.updateOrder(ordem.id, { estado: "aceite", aceite_em: new Date().toISOString() });
  }
  await notificar(deposit.user_id, { tipo: "deposito_recebido", titulo: "Agente confirmou", corpo: "O agente confirmou o recebimento. Aguarda a aprovação final da equipa MOZOUT." });
  void nota;
  return { ok: true };
}

/** Aprovação final (admin). Idempotente — nunca credita a dobrar. */
export async function aprovarDeposito(adminId: string, depositoId: string): Promise<{ ok: boolean; erro?: string }> {
  const deposit = await db.findDeposit(depositoId);
  if (!deposit) return { ok: false, erro: "Depósito não encontrado." };
  if (deposit.estado === "aprovado") return { ok: true };
  if (!["pendente_analise", "identificado", "aguardando_confirmacoes"].includes(deposit.estado)) {
    return { ok: false, erro: `Não é possível aprovar um depósito no estado “${deposit.estado}”.` };
  }

  const credito = toCents(deposit.valor_liquido_usd ?? deposit.valor_usd);
  await db.applyLedger({
    userId: deposit.user_id,
    tipo: "deposito",
    valorCents: credito,
    moeda: "USD",
    referencia: `CR-${deposit.referencia}`,
    descricao: deposit.metodo === "usdt_trc20" ? "Depósito USDT TRC20 aprovado" : `Depósito ${deposit.metodo.toUpperCase()} aprovado · ref. ${deposit.referencia}`,
    rateId: deposit.rate_id,
  });

  await db.updateDeposit(deposit.id, { estado: "aprovado", decidido_em: new Date().toISOString() });
  const ordens = await db.listOrders({ tipo: "deposito" });
  const ordem = ordens.find((o) => o.referencia_id === deposit.id);
  if (ordem) await db.updateOrder(ordem.id, { estado: "concluida", concluida_em: new Date().toISOString() });

  const user = await db.findUserById(deposit.user_id);
  await notificar(deposit.user_id, { tipo: "deposito_aprovado", titulo: "Depósito aprovado", corpo: `${usdtFormat(credito)} foram creditados na tua carteira (ref. ${deposit.referencia}).`, telefone: user?.telefone });
  await db.insertAudit({ ator: adminId, acao: "deposito.aprovado", entidade: "deposits", entidade_id: deposit.id, dados: { valor_liquido: fromCents(credito) } });
  return { ok: true };
}

export async function recusarDeposito(adminId: string, depositoId: string, motivo: string): Promise<{ ok: boolean; erro?: string }> {
  const deposit = await db.findDeposit(depositoId);
  if (!deposit) return { ok: false, erro: "Depósito não encontrado." };
  if (deposit.estado === "aprovado") return { ok: false, erro: "Depósito já aprovado — não pode ser recusado." };
  await db.updateDeposit(deposit.id, { estado: "recusado", motivo_recusa: motivo, decidido_em: new Date().toISOString() });
  const ordens = await db.listOrders({ tipo: "deposito" });
  const ordem = ordens.find((o) => o.referencia_id === deposit.id);
  if (ordem) await db.updateOrder(ordem.id, { estado: "cancelada" });
  const user = await db.findUserById(deposit.user_id);
  await notificar(deposit.user_id, { tipo: "deposito_recusado", titulo: "Depósito recusado", corpo: `Motivo: ${motivo}. Nenhum valor foi debitado da tua carteira.`, telefone: user?.telefone });
  await db.insertAudit({ ator: adminId, acao: "deposito.recusado", entidade: "deposits", entidade_id: deposit.id, dados: { motivo } });
  return { ok: true };
}

/* ────────────────────────────────────────────────────────────
 * LEVANTAMENTOS
 * ──────────────────────────────────────────────────────────── */

export interface CotacaoLevantamento {
  taxaBase: number;
  taxaEfetiva: number;
  valorMznBrutoCents: number;
  taxaUsdCents: number;
  comissaoAgenteCents: number;
  valorLiquidoMznCents: number;
}

export async function cotarLevantamento(metodo: LevantamentoMetodo, valorUsdCents: number): Promise<CotacaoLevantamento> {
  const cx = await cotacao("USD/MZN");
  const taxaFixa = metodo === "usdt_trc20" ? await getFee("levantamento_usdt_usd", 1.5) : metodo === "mpesa" ? await getFee("levantamento_mpesa_usd", 2.5) : await getFee("levantamento_emola_usd", 2.5);
  const comissaoPct = await getFee("comissao_agente_pct", 1.0);
  const taxaCents = toCents(taxaFixa);
  const liquidoUsd = Math.max(0, valorUsdCents - taxaCents);
  return {
    taxaBase: cx.valor,
    taxaEfetiva: cx.valorEfetivo,
    valorMznBrutoCents: usdParaMzn(valorUsdCents, cx.valorEfetivo),
    taxaUsdCents: taxaCents,
    comissaoAgenteCents: Math.round((valorUsdCents * comissaoPct) / 100),
    valorLiquidoMznCents: usdParaMzn(liquidoUsd, cx.valorEfetivo),
  };
}

/** Cria o levantamento: debita valor+taxa do ledger e reserva o valor (estado pendente nunca conta como disponível). */
export async function criarLevantamento(
  user: User,
  metodo: LevantamentoMetodo,
  valorUsdCents: number,
  destino: string,
): Promise<{ ok: true; withdrawal: Withdrawal; agente: Agent | null; cotacao: CotacaoLevantamento } | { ok: false; erro: string }> {
  const q = await cotarLevantamento(metodo, valorUsdCents);
  const cx = await cotacao("USD/MZN");
  const referencia = novaReferencia(metodo === "usdt_trc20" ? "LEV-T" : metodo === "mpesa" ? "LEV-M" : "LEV-E");

  // Reserva: debita já valor + taxa. Se a operação for cancelada, faz-se estorno.
  try {
    await db.applyLedger({
      userId: user.id,
      tipo: "levantamento",
      valorCents: -(valorUsdCents + q.taxaUsdCents),
      moeda: "USD",
      referencia: `RL-${referencia}`,
      descricao: `Levantamento ${metodo.toUpperCase()} · reserva de fundos`,
      rateId: cx.rateId,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "SALDO_INSUFICIENTE") {
      return { ok: false, erro: "Saldo insuficiente para cobrir o levantamento e a taxa." };
    }
    throw err;
  }

  try {
    await db.insertReservation({ user_id: user.id, valor_usd: fromCents(valorUsdCents), referencia: `RSV-${referencia}` });
  } catch {
    /* a reserva é auxiliar — o ledger já garante o não-uso duplo */
  }

  const agente = metodo === "usdt_trc20" ? null : await selecionarAgente(metodo);
  const withdrawal = await db.insertWithdrawal({
    user_id: user.id,
    metodo,
    valor_usd: fromCents(valorUsdCents),
    valor_mzn: metodo === "usdt_trc20" ? null : fromCents(q.valorMznBrutoCents),
    valor_liquido_mzn: metodo === "usdt_trc20" ? null : fromCents(q.valorLiquidoMznCents),
    taxa: fromCents(q.taxaUsdCents),
    comissao: fromCents(q.comissaoAgenteCents),
    destino,
    rate_id: cx.rateId,
    agent_id: agente?.id ?? null,
    referencia,
    codigo_tx: null,
    estado: agente ? "atribuida" : "aguardando_agente",
    observacoes: null,
  });

  if (agente) {
    await db.insertOrder({
      agent_id: agente.id,
      tipo: "levantamento",
      referencia_id: withdrawal.id,
      estado: "pendente",
      expira_em: new Date(Date.now() + 20 * 60_000).toISOString(),
    });
    const agenteUser = await db.findUserById(agente.user_id);
    if (agenteUser) {
      await notificar(agenteUser.id, {
        tipo: "nova_ordem_agente",
        titulo: "Novo levantamento para pagar",
        corpo: `Transfere MT ${(q.valorLiquidoMznCents / 100).toFixed(2)} para ${destino}. Tens 20 minutos.`,
        telefone: agenteUser.telefone,
      });
    }
  }

  await notificar(user.id, {
    tipo: "levantamento_solicitado",
    titulo: "Levantamento solicitado",
    corpo: `Reservámos ${usdtFormat(valorUsdCents)} + taxa. Referência ${referencia}.`,
    telefone: user.telefone,
  });
  await db.insertAudit({ ator: user.id, acao: "levantamento.criado", entidade: "withdrawals", entidade_id: withdrawal.id, dados: { metodo, valor: fromCents(valorUsdCents), destino } });
  return { ok: true, withdrawal, agente, cotacao: q };
}

/** Estorno de um levantamento (cancelamento/falha). */
export async function estornarLevantamento(adminId: string | null, withdrawalId: string, motivo: string): Promise<{ ok: boolean; erro?: string }> {
  const w = await db.findWithdrawal(withdrawalId);
  if (!w) return { ok: false, erro: "Levantamento não encontrado." };
  if (w.estado === "concluida") return { ok: false, erro: "Levantamento já concluído — não pode ser estornado." };
  if (w.estado === "cancelada") return { ok: true }; // idempotente

  const total = toCents(w.valor_usd) + toCents(w.taxa);
  await db.applyLedger({
    userId: w.user_id,
    tipo: "estorno",
    valorCents: total,
    moeda: "USD",
    referencia: `ES-${w.referencia}`,
    descricao: `Estorno do levantamento ${w.referencia} · ${motivo}`,
    rateId: w.rate_id,
  });
  await db.updateWithdrawal(w.id, { estado: "cancelada", observacoes: motivo });
  const reservas = await db.findReservationByReferencia(`RSV-${w.referencia}`);
  if (reservas) await db.updateReservation(reservas.id, { estado: "cancelada" });
  const ordens = await db.listOrders({ tipo: "levantamento" });
  const ordem = ordens.find((o) => o.referencia_id === w.id);
  if (ordem) await db.updateOrder(ordem.id, { estado: "cancelada" });
  pingCliente(w.user_id); // saldo devolvido — atualiza já
  if (adminId) await db.insertAudit({ ator: adminId, acao: "levantamento.estornado", entidade: "withdrawals", entidade_id: w.id, dados: { motivo } });
  return { ok: true };
}

/** Agente marca como enviado (com referência da transferência). */
export async function agenteMarcarEnviado(agente: Agent, withdrawalId: string, referenciaTx: string): Promise<{ ok: boolean; erro?: string }> {
  const w = await db.findWithdrawal(withdrawalId);
  if (!w || w.agent_id !== agente.id) return { ok: false, erro: "Operação não encontrada." };
  if (!/^[A-Za-z0-9-]{5,32}$/.test(referenciaTx)) return { ok: false, erro: "Referência inválida." };
  await db.updateWithdrawal(w.id, { codigo_tx: referenciaTx.toUpperCase(), estado: "aguardando_confirmacao" });
  await notificar(w.user_id, { tipo: "levantamento_solicitado", titulo: "Pagamento enviado", corpo: `O agente enviou ${w.valor_liquido_mzn ? `MT ${w.valor_liquido_mzn.toFixed(2)}` : "a transferência"}. Ref. ${referenciaTx.toUpperCase()}. Confirma a receção na app.` });
  return { ok: true };
}

/** Cliente confirma a receção → conclui o levantamento. */
export async function clienteConfirmarLevantamento(user: User, withdrawalId: string): Promise<{ ok: boolean; erro?: string }> {
  const w = await db.findWithdrawal(withdrawalId);
  if (!w || w.user_id !== user.id) return { ok: false, erro: "Levantamento não encontrado." };
  if (w.estado === "concluida") return { ok: true };
  if (w.estado !== "aguardando_confirmacao" && w.estado !== "enviada") return { ok: false, erro: "A operação ainda não foi marcada como enviada pelo agente." };

  await db.updateWithdrawal(w.id, { estado: "concluida", concluida_em: new Date().toISOString() });
  const ordens = await db.listOrders({ tipo: "levantamento" });
  const ordem = ordens.find((o) => o.referencia_id === w.id);
  if (ordem) await db.updateOrder(ordem.id, { estado: "concluida", concluida_em: new Date().toISOString() });
  const reserva = await db.findReservationByReferencia(`RSV-${w.referencia}`);
  if (reserva) await db.updateReservation(reserva.id, { estado: "consumida" });
  if (w.agent_id) {
    const agente = await db.findAgent(w.agent_id);
    if (agente) {
      await db.updateAgent(agente.id, {
        total_operacoes: agente.total_operacoes + 1,
        operacoes_concluidas: agente.operacoes_concluidas + 1,
      });
    }
  }
  await notificar(user.id, { tipo: "levantamento_concluido", titulo: "Levantamento concluído", corpo: `Recebeste ${w.valor_liquido_mzn ? `MT ${w.valor_liquido_mzn.toFixed(2)}` : "a transferência"} (ref. ${w.referencia}).`, telefone: user.telefone });
  await db.insertAudit({ ator: user.id, acao: "levantamento.concluido", entidade: "withdrawals", entidade_id: w.id, dados: {} });
  return { ok: true };
}

export { centsToDb };
export const depositoMetodoLabel: Record<DepositoMetodo, string> = {
  usdt_trc20: "USDT TRC20",
  mpesa: "M-Pesa",
  emola: "e-Mola",
};
