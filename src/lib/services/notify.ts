import { db } from "../db";
import { enviarSms } from "../integrations/notifica";
import { pingCliente } from "../realtime";

export type NotificacaoTipo =
  | "codigo_verificacao"
  | "conta_ativada"
  | "cartao_emitido"
  | "cartao_congelado"
  | "cartao_descongelado"
  | "deposito_recebido"
  | "deposito_aprovado"
  | "deposito_recusado"
  | "levantamento_solicitado"
  | "levantamento_concluido"
  | "levantamento_cancelado"
  | "nova_ordem_agente"
  | "ordem_atribuida"
  | "kyc_submetido"
  | "kyc_aprovado"
  | "kyc_rejeitado"
  | "disputa_aberta"
  | "disputa_resolvida"
  | "pagamento_emola"
  | "seguranca";

export async function notificarInApp(userId: string, tipo: NotificacaoTipo, titulo: string, corpo: string) {
  return db.insertNotification({ user_id: userId, tipo, canal: "in_app", titulo, corpo, estado: "enviada" });
}

export async function notificarSms(userId: string, telefone: string, tipo: NotificacaoTipo, titulo: string, corpo: string) {
  const texto = `MOZOUT-USD · ${titulo}: ${corpo}`;
  const resultado = await enviarSms(telefone, texto.slice(0, 320));
  await db.insertNotification({
    user_id: userId,
    tipo,
    canal: "sms",
    titulo,
    corpo,
    estado: resultado.ok ? "enviada" : "falhou",
  });
  return resultado;
}

/** Envia in-app + SMS (se telefone fornecido). Nunca lança — falhas de SMS não bloqueiam o fluxo. */
export async function notificar(
  userId: string,
  opts: { tipo: NotificacaoTipo; titulo: string; corpo: string; telefone?: string | null },
) {
  await notificarInApp(userId, opts.tipo, opts.titulo, opts.corpo);
  pingCliente(userId); // tempo real: saldo/extrato/notificações sem refresh
  if (opts.telefone) {
    await notificarSms(userId, opts.telefone, opts.tipo, opts.titulo, opts.corpo).catch(() => undefined);
  }
}
