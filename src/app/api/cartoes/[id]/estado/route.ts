import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notificar } from "@/lib/services/notify";

const schema = z.object({ acao: z.enum(["congelar", "descongelar"]) });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Ação inválida." }, { status: 422 });

  const card = await db.findCard(id);
  if (!card) return NextResponse.json({ erro: "Cartão não encontrado." }, { status: 404 });
  if (card.user_id !== user.id) return NextResponse.json({ erro: "Não tens acesso a este cartão." }, { status: 403 });

  const { acao } = parsed.data;
  if (acao === "congelar" && card.estado !== "ativo") return NextResponse.json({ erro: "Apenas cartões ativos podem ser congelados." }, { status: 400 });
  if (acao === "descongelar" && card.estado !== "congelado") return NextResponse.json({ erro: "Apenas cartões congelados podem ser descongelados." }, { status: 400 });

  const novoEstado = acao === "congelar" ? "congelado" : "ativo";
  await db.updateCard(card.id, { estado: novoEstado });
  await db.insertAudit({ ator: user.id, acao: `cartao.${acao}`, entidade: "cards", entidade_id: card.id, dados: {} });
  await notificar(user.id, {
    tipo: acao === "congelar" ? "cartao_congelado" : "cartao_descongelado",
    titulo: acao === "congelar" ? "Cartão congelado" : "Cartão ativo novamente",
    corpo: acao === "congelar" ? "O teu cartão não autorizará pagamentos até descongelares." : "O teu cartão voltou a estar operacional.",
  });

  return NextResponse.json({ ok: true, estado: novoEstado });
}
