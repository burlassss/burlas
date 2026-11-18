import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import { enviarSms } from "@/lib/integrations/notifica";

/** Reenvia uma notificação SMS que falhou. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "notificacoes.ver")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const { id } = await ctx.params;
  const todas = await db.listAllNotifications();
  const notificacao = todas.find((n) => n.id === id);
  if (!notificacao) return NextResponse.json({ erro: "Notificação não encontrada." }, { status: 404 });
  if (notificacao.canal !== "sms") return NextResponse.json({ erro: "Só é possível reenviar notificações SMS." }, { status: 400 });

  const user = await db.findUserById(notificacao.user_id);
  if (!user) return NextResponse.json({ erro: "Destinatário não encontrado." }, { status: 404 });

  const resultado = await enviarSms(user.telefone, `MOZOUT-USD · ${notificacao.titulo}: ${notificacao.corpo}`.slice(0, 320));
  await db.insertNotification({
    user_id: user.id,
    tipo: notificacao.tipo,
    canal: "sms",
    titulo: notificacao.titulo,
    corpo: notificacao.corpo,
    estado: resultado.ok ? "enviada" : "falhou",
  });
  await db.insertAudit({ ator: admin.id, acao: "notificacao.reenviada", entidade: "notifications", entidade_id: id, dados: { ok: resultado.ok } });

  if (!resultado.ok) return NextResponse.json({ erro: `Falha no envio: ${resultado.erro}` }, { status: 502 });
  return NextResponse.json({ ok: true });
}
