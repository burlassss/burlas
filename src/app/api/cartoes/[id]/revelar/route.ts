import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";

/** Revela os dados completos do cartão — apenas para o dono. Tudo fica auditado. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await ctx.params;
  const card = await db.findCard(id);
  if (!card) return NextResponse.json({ erro: "Cartão não encontrado." }, { status: 404 });
  if (card.user_id !== user.id) return NextResponse.json({ erro: "Não tens acesso a este cartão." }, { status: 403 });
  if (card.estado === "cancelado") return NextResponse.json({ erro: "Este cartão foi cancelado." }, { status: 400 });

  await db.insertAudit({ ator: user.id, acao: "cartao.revelado", entidade: "cards", entidade_id: card.id, dados: {} });

  return NextResponse.json({
    numero: decryptSecret(card.numero),
    cvv: decryptSecret(card.cvv),
    validade: card.validade,
  });
}
