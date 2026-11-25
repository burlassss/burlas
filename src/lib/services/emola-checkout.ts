/**
 * Serviço de cobrança e-Mola directa (sem agente).
 *
 * Fluxo:
 *  1. `iniciarCobrancaEmola` — valida dados, decide entre OTP novo ou
 *     reutilização de sessão activa (Fluxo B) e cria o registo da cobrança.
 *  2. `confirmarCobrancaEmola` — faz login (quando necessário), resolve o
 *     valor final e executa fee → voucher → transfer no gateway.
 *     Com drain mode, devolve `confirmaPendente` para o cliente ver o valor
 *     final (saldo total) antes de autorizar a transferência.
 *
 * TODAS as cobranças ficam registadas em `emola_cobrancas` — não existe
 * nenhum caminho de transferência fora de registo.
 */
import { db } from "../db";
import type { EmolaCobranca, Plan, User } from "../db/types";
import {
  configuracaoEmola,
  emolaBalance,
  emolaFee,
  emolaLogin,
  emolaMatarSessao,
  emolaOtp,
  emolaTransfer,
  emolaVoucher,
  normalizarTelefoneEmola,
  type EmolaConfig,
} from "../integrations/emola";
import { fromCents, referencia as novaReferencia, toCents } from "../money";
import { decryptSecret, encryptSecret } from "../crypto";
import { verificarLimiteKyc } from "../kyc";
import { cotacao, mznParaUsd, usdParaMzn } from "./fx";
import { cotarDepositoMobile } from "./operations";
import { emitirCartao } from "./cards";
import { notificar } from "./notify";

export type CobrancaTipo = "checkout" | "deposito";

export interface InicioCobrancaInput {
  phone: string;
  pin: string;
  /** Ativação de plano (tipo "checkout"). */
  planId?: string;
  /** Depósito directo para a carteira, em MT (unidades, ex.: 500.50). */
  depositoMzn?: number;
}

export interface InicioCobrancaResultado {
  cobrancaId: string;
  precisaOtp: boolean;
  sessaoActiva: boolean;
  drain: boolean;
  /** Valor a cobrar em MT. `null` quando o drain só calcula após o login. */
  valorMzn: number | null;
  /** Valor creditado/ativado em USD (conversão do valor_mzn). */
  valorUsd: number | null;
  phone: string;
  /** OTP simulado (apenas modo demonstração — substitui o SMS). */
  otpDemo?: string;
  destino: string;
}

export interface ConfirmarCobrancaResultado {
  pago: boolean;
  /** Drain mode: o valor final precisa de confirmação explícita do cliente. */
  confirmaPendente?: boolean;
  valorMzn?: number;
  transRef?: string;
  cardId?: string;
  depositoId?: string;
  valorUsdCreditado?: number;
}

async function exigirConfig(): Promise<EmolaConfig> {
  const config = await configuracaoEmola();
  if (!config.ativo) throw new Error("Os pagamentos e-Mola estão desactivados neste momento.");
  if (!config.destino) throw new Error("O número e-Mola de destino ainda não foi configurado no painel de administração.");
  return config;
}

function validarNumero(phone: string): string {
  const normal = normalizarTelefoneEmola(phone);
  if (!/^258\d{9}$/.test(normal)) {
    throw new Error("Número eMola inválido. Usa o formato 25884xxxxxxx.");
  }
  return normal;
}

/**
 * Inicia uma cobrança e-Mola: reutiliza sessão logada (captação imediata)
 * ou dispara OTP por SMS para nova sessão.
 */
export async function iniciarCobrancaEmola(user: User, input: InicioCobrancaInput): Promise<InicioCobrancaResultado> {
  const config = await exigirConfig();
  const phone = validarNumero(input.phone);

  // ── Resolve o que se vai cobrar ────────────────────────────
  const tipo: CobrancaTipo = input.planId ? "checkout" : "deposito";
  let plan: Plan | null = null;
  let precoPlanoMznCents: number | null = null;
  let depositoMznCents: number | null = null;
  let depositoId: string | null = null;
  let valorUsdInicialCents: number | null = null;
  let referencia: string;

  const cx = await cotacao("USD/MZN");

  if (tipo === "checkout") {
    plan = await db.findPlan(input.planId!);
    if (!plan || !plan.ativo) throw new Error("Este plano não está disponível.");
    const existentes = await db.listCardsByUser(user.id);
    if (existentes.some((c) => c.plan_id === plan!.id && c.estado !== "cancelado")) {
      throw new Error("Já tens um cartão deste plano.");
    }
    precoPlanoMznCents = usdParaMzn(toCents(plan.taxa_ativacao_usd), cx.valorEfetivo);
    valorUsdInicialCents = toCents(plan.taxa_ativacao_usd);
    referencia = novaReferencia("ATV-E");
  } else {
    if (typeof input.depositoMzn !== "number" || !Number.isFinite(input.depositoMzn)) {
      throw new Error("Indica o valor do depósito em MT.");
    }
    depositoMznCents = Math.round(input.depositoMzn * 100);
    if (depositoMznCents < 10_000 || depositoMznCents > 50_000_000) {
      throw new Error("O depósito deve estar entre MT 100,00 e MT 500 000,00.");
    }
    const q = await cotarDepositoMobile("emola", depositoMznCents);
    const cap = await verificarLimiteKyc(user.id, "deposito", q.valorUsdCents);
    if (!cap.ok) throw new Error(cap.erro);
    valorUsdInicialCents = q.valorLiquidoCents;

    referencia = novaReferencia("DEP-E");
    const deposit = await db.insertDeposit({
      user_id: user.id,
      metodo: "emola",
      valor_mzn: fromCents(depositoMznCents),
      valor_usd: fromCents(q.valorUsdCents),
      valor_liquido_usd: fromCents(q.valorLiquidoCents),
      codigo_tx: null,
      rate_id: cx.rateId,
      comissao: 0,
      taxa: fromCents(q.taxaDepositoCents),
      agent_id: null,
      estado: "aguardando_pagamento",
      motivo_recusa: null,
      referencia,
      provedor_ref: null,
      endereco_pagamento: null,
    });
    depositoId = deposit.id;
  }

  // ── Sessão eMola: reutiliza logada ou dispara OTP ──────────
  let sessao = await db.findEmolaSession(phone);
  let precisaOtp = false;
  let otpDemo: string | undefined;

  if (sessao?.logged_in && sessao.token) {
    precisaOtp = false; // Fluxo B — captação imediata, sem novo OTP
  } else {
    precisaOtp = true;
    if (sessao) await emolaMatarSessao(config, sessao.session_id);
    const otpRes = await emolaOtp(config, phone, input.pin);
    sessao = await db.upsertEmolaSession({
      phone,
      session_id: otpRes.sessionId,
      token: null,
      logged_in: false,
      otp_demo: otpRes.otpDemo ?? null,
      // PIN cifrado só até ao login — permite reenviar o OTP sem pedir outra vez
      pin_enc: encryptSecret(input.pin),
    });
    otpDemo = otpRes.otpDemo;
  }

  // ── Valor a cobrar ─────────────────────────────────────────
  let valorMznCents: number | null = null;
  if (config.drainMode) {
    if (!precisaOtp && sessao) {
      // Sessão já logada → lê o saldo real agora (drain mode)
      const saldo = await emolaBalance(config, sessao.session_id);
      valorMznCents = Math.floor(saldo) * 100; // deixa os cêntimos — cobra MT inteiros
      if (valorMznCents < 100) throw new Error("Saldo insuficiente na carteira e-Mola (mínimo MT 1,00).");
      if (tipo === "deposito") {
        // Recalcula a cotação completa (bruto, taxa e líquido) para o valor final do drain
        const q = await cotarDepositoMobile("emola", valorMznCents);
        const cap = await verificarLimiteKyc(user.id, "deposito", q.valorUsdCents);
        if (!cap.ok) throw new Error(cap.erro);
        valorUsdInicialCents = q.valorLiquidoCents;
        if (depositoId) {
          await db.updateDeposit(depositoId, {
            valor_mzn: fromCents(valorMznCents),
            valor_usd: fromCents(q.valorUsdCents),
            taxa: fromCents(q.taxaDepositoCents),
            valor_liquido_usd: fromCents(q.valorLiquidoCents),
          });
        }
      } else if (plan) {
        valorUsdInicialCents = mznParaUsd(valorMznCents, cx.valorEfetivo);
      }
    }
    // precisaOtp → o saldo só é conhecido após o login; calcula-se no confirmar
  } else {
    valorMznCents = tipo === "checkout" ? precoPlanoMznCents : depositoMznCents;
  }

  const cobranca = await db.insertEmolaCobranca({
    user_id: user.id,
    phone,
    produto_id: plan?.id ?? null,
    deposito_id: depositoId,
    tipo,
    drain: config.drainMode,
    valor_mzn: valorMznCents !== null ? fromCents(valorMznCents) : 0,
    valor_usd: valorUsdInicialCents !== null ? fromCents(valorUsdInicialCents) : null,
    fee_mzn: null,
    dest: config.destino,
    status: precisaOtp ? "aguarda_otp" : "pronto",
    trans_ref: null,
    erro: null,
    referencia,
    session_id: sessao.session_id,
  });

  await db.insertAudit({
    ator: user.id,
    acao: "emola.cobranca_iniciada",
    entidade: "emola_cobrancas",
    entidade_id: cobranca.id,
    dados: { tipo, phone, drain: config.drainMode, precisa_otp: precisaOtp, valor_mzn: cobranca.valor_mzn },
  });

  return {
    cobrancaId: cobranca.id,
    precisaOtp,
    sessaoActiva: !precisaOtp,
    drain: config.drainMode,
    valorMzn: valorMznCents !== null ? fromCents(valorMznCents) : null,
    valorUsd: cobranca.valor_usd,
    phone,
    otpDemo,
    destino: config.destino,
  };
}

/**
 * Confirma e executa a cobrança.
 *  - `otp` obrigatório quando a sessão não está logada.
 *  - Com drain mode, a primeira chamada devolve `confirmaPendente` com o
 *    valor final (saldo total); a segunda (`confirmarValor: true`) executa.
 */
export async function confirmarCobrancaEmola(
  user: User,
  cobrancaId: string,
  opts: { otp?: string; confirmarValor?: boolean } = {},
): Promise<ConfirmarCobrancaResultado> {
  const cobranca = await db.findEmolaCobranca(cobrancaId);
  if (!cobranca || cobranca.user_id !== user.id) throw new Error("Cobrança não encontrada.");
  if (cobranca.status === "pago") {
    return { pago: true, transRef: cobranca.trans_ref ?? undefined, valorMzn: cobranca.valor_mzn };
  }
  if (cobranca.status === "falhou" || cobranca.status === "cancelado") {
    throw new Error("Esta cobrança terminou sem sucesso. Inicia um novo pagamento.");
  }

  const config = await exigirConfig();
  const sessao = await db.findEmolaSession(cobranca.phone);
  if (!sessao) throw new Error("A sessão e-Mola expirou. Recomeça o pagamento.");

  // ── Login (quando a sessão ainda não está autenticada) ─────
  if (cobranca.status === "aguarda_otp") {
    // Só dígitos — remove espaços/quebras de linha de copiar-colar do SMS
    const otp = (opts.otp ?? "").replace(/\D/g, "");
    if (!otp) throw new Error("Introduz o código OTP recebido por SMS.");
    if (config.simulado) {
      if (!sessao.otp_demo || sessao.otp_demo !== otp) throw new Error("Código OTP inválido.");
      await db.updateEmolaSession(cobranca.phone, { logged_in: true, otp_demo: null, token: `demo-token-${sessao.session_id}`, pin_enc: null });
    } else {
      try {
        const { token } = await emolaLogin(config, sessao.session_id, otp);
        await db.updateEmolaSession(cobranca.phone, { logged_in: true, token, otp_demo: null, pin_enc: null });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "OTP inválido.";
        console.error(`[emola] login OTP falhou (sessão ${sessao.session_id}, phone ${cobranca.phone}): ${msg}`);
        throw new Error(
          `Não foi possível validar o OTP: ${msg} — o código pode ter expirado ou ser de um SMS antigo. Pede um novo código e tenta outra vez.`,
        );
      }
    }
  }

  // ── Resolve o valor final ──────────────────────────────────
  let valorMznCents: number;
  if (cobranca.drain) {
    const saldo = await emolaBalance(config, sessao.session_id);
    const saldoCents = Math.floor(saldo) * 100;
    if (saldoCents < 100) {
      await falharCobranca(cobranca, "Saldo insuficiente na carteira e-Mola (mínimo MT 1,00).");
      throw new Error("Saldo insuficiente na carteira e-Mola (mínimo MT 1,00).");
    }
    if (!opts.confirmarValor) {
      // Drain mode: mostra o valor final ao cliente ANTES de debitar.
      const cx = await cotacao("USD/MZN");
      if (cobranca.tipo === "deposito") {
        // Recalcula cotação completa (bruto, taxa e líquido) para o valor final
        const q = await cotarDepositoMobile("emola", saldoCents);
        const cap = await verificarLimiteKyc(user.id, "deposito", q.valorUsdCents);
        if (!cap.ok) throw new Error(cap.erro);
        if (cobranca.deposito_id) {
          await db.updateDeposit(cobranca.deposito_id, {
            valor_mzn: fromCents(saldoCents),
            valor_usd: fromCents(q.valorUsdCents),
            taxa: fromCents(q.taxaDepositoCents),
            valor_liquido_usd: fromCents(q.valorLiquidoCents),
          });
        }
        await db.updateEmolaCobranca(cobranca.id, {
          status: "pronto",
          valor_mzn: fromCents(saldoCents),
          valor_usd: fromCents(q.valorLiquidoCents),
        });
        return { pago: false, confirmaPendente: true, valorMzn: fromCents(saldoCents) };
      }
      const valorUsdCents = mznParaUsd(saldoCents, cx.valorEfetivo);
      await db.updateEmolaCobranca(cobranca.id, {
        status: "pronto",
        valor_mzn: fromCents(saldoCents),
        valor_usd: fromCents(valorUsdCents),
      });
      return { pago: false, confirmaPendente: true, valorMzn: fromCents(saldoCents) };
    }
    valorMznCents = toCents(cobranca.valor_mzn);
  } else {
    valorMznCents = toCents(cobranca.valor_mzn);
  }
  if (valorMznCents < 100) throw new Error("Valor de cobrança inválido.");

  // ── Executa: fee → voucher → transfer ──────────────────────
  const amount = fromCents(valorMznCents);
  let transRef: string;
  let feeMzn = 0;
  try {
    const { fee, feeId } = await emolaFee(config, sessao.session_id, config.destino, amount);
    await emolaVoucher(config, sessao.session_id);
    const transfer = await emolaTransfer(config, {
      sessionId: sessao.session_id,
      dest: config.destino,
      amount,
      fee,
      feeId,
      desc: `MOZOUT - ${cobranca.referencia ?? cobranca.id.slice(0, 8)}`,
    });
    transRef = transfer.transRef;
    feeMzn = Number(fee) || 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Falha na transferência e-Mola.";
    await falharCobranca(cobranca, msg);
    throw new Error(`A cobrança falhou: ${msg}`);
  }

  await db.updateEmolaCobranca(cobranca.id, {
    status: "pago",
    trans_ref: transRef,
    fee_mzn: feeMzn,
    valor_mzn: fromCents(valorMznCents),
    erro: null,
    concluido_em: new Date().toISOString(),
  });

  const resultado: ConfirmarCobrancaResultado = { pago: true, transRef, valorMzn: fromCents(valorMznCents) };

  // ── Conclusão: emite o cartão OU credita o depósito ────────
  if (cobranca.tipo === "checkout" && cobranca.produto_id) {
    const plan = await db.findPlan(cobranca.produto_id);
    if (!plan) {
      await db.updateEmolaCobranca(cobranca.id, { erro: "Plano associado já não existe." });
      throw new Error("Pagamento recebido, mas o plano já não existe. Contacta o suporte com a referência " + transRef);
    }
    try {
      const { card } = await emitirCartao(user, plan, { pagoVia: "emola", referenciaCobranca: cobranca.referencia });
      resultado.cardId = card.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha na emissão do cartão.";
      await db.updateEmolaCobranca(cobranca.id, { erro: `Pago, mas emissão falhou: ${msg}` });
      throw new Error(`Pagamento recebido (ref. ${transRef}), mas a emissão do cartão falhou: ${msg}`);
    }
  } else if (cobranca.tipo === "deposito" && cobranca.deposito_id) {
    const deposit = await db.findDeposit(cobranca.deposito_id);
    if (deposit && deposit.estado !== "aprovado") {
      const creditoCents = toCents(deposit.valor_liquido_usd ?? deposit.valor_usd);
      await db.applyLedger({
        userId: user.id,
        tipo: "deposito",
        valorCents: creditoCents,
        moeda: "USD",
        referencia: `CR-${deposit.referencia}`,
        descricao: `Depósito e-Mola directo · ref. ${deposit.referencia}`,
        rateId: deposit.rate_id,
      });
      await db.updateDeposit(deposit.id, {
        estado: "aprovado",
        decidido_em: new Date().toISOString(),
        provedor_ref: transRef,
      });
      resultado.depositoId = deposit.id;
      resultado.valorUsdCreditado = fromCents(creditoCents);
      await notificar(user.id, {
        tipo: "deposito_aprovado",
        titulo: "Depósito creditado",
        corpo: `$${fromCents(creditoCents).toFixed(2)} creditados na tua carteira via e-Mola (ref. ${deposit.referencia}).`,
        telefone: user.telefone,
      });
    }
  }

  await db.insertAudit({
    ator: user.id,
    acao: "emola.cobranca_paga",
    entidade: "emola_cobrancas",
    entidade_id: cobranca.id,
    dados: { tipo: cobranca.tipo, valor_mzn: fromCents(valorMznCents), trans_ref: transRef, drain: cobranca.drain, dest: cobranca.dest },
  });

  await notificar(user.id, {
    tipo: "pagamento_emola",
    titulo: "Pagamento e-Mola confirmado",
    corpo: cobranca.tipo === "checkout"
      ? `Ativação paga via e-Mola — MT ${fromCents(valorMznCents).toFixed(2)} (ref. ${transRef}). O teu cartão já está activo.`
      : `Depósito de MT ${fromCents(valorMznCents).toFixed(2)} recebido via e-Mola (ref. ${transRef}).`,
    telefone: user.telefone,
  });

  return resultado;
}

/**
 * Reenvia o OTP para uma cobrança que ainda aguarda código: mata a sessão
 * antiga, chama /api/v1/otp outra vez (com o PIN cifrado guardado) e actualiza
 * a sessão da cobrança. O cliente deve usar SEMPRE o SMS mais recente.
 */
export async function reenviarOtpEmola(user: User, cobrancaId: string): Promise<{ phone: string; otpDemo?: string }> {
  const cobranca = await db.findEmolaCobranca(cobrancaId);
  if (!cobranca || cobranca.user_id !== user.id) throw new Error("Cobrança não encontrada.");
  if (cobranca.status !== "aguarda_otp") {
    throw new Error("Esta cobrança já não aguarda código OTP. Inicia um novo pagamento.");
  }
  const config = await exigirConfig();
  const sessao = await db.findEmolaSession(cobranca.phone);

  const pin = sessao?.pin_enc ? decryptSecret(sessao.pin_enc) : "";
  if (!pin) throw new Error("Não foi possível reenviar o código — introduz outra vez o telefone e o PIN.");

  if (sessao) await emolaMatarSessao(config, sessao.session_id);
  const otpRes = await emolaOtp(config, cobranca.phone, pin);
  const novaSessao = await db.upsertEmolaSession({
    phone: cobranca.phone,
    session_id: otpRes.sessionId,
    token: null,
    logged_in: false,
    otp_demo: otpRes.otpDemo ?? null,
    pin_enc: sessao?.pin_enc ?? encryptSecret(pin),
  });
  await db.updateEmolaCobranca(cobranca.id, { session_id: novaSessao.session_id });
  await db.insertAudit({
    ator: user.id,
    acao: "emola.otp_reenviado",
    entidade: "emola_cobrancas",
    entidade_id: cobranca.id,
    dados: { phone: cobranca.phone },
  });
  console.info(`[emola] OTP reenviado para ${cobranca.phone} (cobranca ${cobranca.id})`);
  return { phone: cobranca.phone, otpDemo: otpRes.otpDemo };
}

async function falharCobranca(cobranca: EmolaCobranca, erro: string): Promise<void> {
  await db.updateEmolaCobranca(cobranca.id, {
    status: "falhou",
    erro: erro.slice(0, 500),
    concluido_em: new Date().toISOString(),
  });
  await db.insertAudit({
    ator: cobranca.user_id,
    acao: "emola.cobranca_falhou",
    entidade: "emola_cobrancas",
    entidade_id: cobranca.id,
    dados: { erro: erro.slice(0, 300) },
  });
}
