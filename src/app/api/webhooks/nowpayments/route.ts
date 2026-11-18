import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verificarAssinaturaIpn } from "@/lib/integrations/nowpayments";
import { confirmarDepositoUsdt } from "@/lib/services/operations";

/**
 * Webhook IPN da NOWPayments.
 *  · Assinatura HMAC-SHA512 verificada (NOWPAYMENTS_IPN_SECRET)
 *  · Idempotente — reenvios do provedor nunca creditam a dobrar
 *  · Nunca creditamos por comprovativo do cliente — apenas aqui
 *    (ou no endpoint de simulação, exclusivo do modo demo).
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const assinatura = req.headers.get("x-nowpayments-sig");

  if (!verificarAssinaturaIpn(rawBody, assinatura)) {
    await db.insertAudit({ ator: null, acao: "webhook.assinatura_invalida", entidade: "webhooks", entidade_id: null, dados: { provedor: "nowpayments" } });
    return NextResponse.json({ erro: "Assinatura inválida." }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ erro: "Payload inválido." }, { status: 400 });
  }

  const paymentId = String(payload.payment_id ?? "");
  const orderId = String(payload.order_id ?? "");
  const status = String(payload.payment_status ?? "").toLowerCase();
  const moeda = String(payload.pay_currency ?? "").toLowerCase();

  // Localiza o depósito pela referência própria ou pelo id do provedor
  let deposito = orderId ? await db.findDepositByReferencia(orderId) : null;
  if (!deposito && paymentId) deposito = await db.findDepositByProvedorRef(paymentId);
  if (!deposito) {
    await db.insertAudit({ ator: null, acao: "webhook.deposito_desconhecido", entidade: "webhooks", entidade_id: paymentId || null, dados: { orderId, status } });
    return NextResponse.json({ ok: true }); // 200 para parar retentativas — nada a creditar
  }

  // Só USDT TRC20 nesta versão
  if (moeda && moeda !== "usdttrc20") {
    await db.updateDeposit(deposito.id, { estado: "falhou", motivo_recusa: `Moeda não suportada: ${moeda}` });
    return NextResponse.json({ ok: true });
  }

  switch (status) {
    case "waiting":
      await db.updateDeposit(deposito.id, { estado: "aguardando_pagamento" });
      break;
    case "confirming":
    case "sending":
      await db.updateDeposit(deposito.id, { estado: "aguardando_confirmacoes" });
      break;
    case "partially_paid":
      await db.updateDeposit(deposito.id, { estado: "identificado" });
      break;
    case "finished":
    case "confirmed":
      await confirmarDepositoUsdt({ depositoId: deposito.id });
      break;
    case "failed":
      await db.updateDeposit(deposito.id, { estado: "falhou" });
      break;
    case "expired":
      await db.updateDeposit(deposito.id, { estado: "expirado" });
      break;
    case "refunded":
      await db.updateDeposit(deposito.id, { estado: "reembolsado" });
      break;
    default:
      await db.updateDeposit(deposito.id, { estado: "identificado" });
  }

  await db.insertAudit({ ator: null, acao: "webhook.processado", entidade: "deposits", entidade_id: deposito.id, dados: { status, paymentId } });
  return NextResponse.json({ ok: true });
}
