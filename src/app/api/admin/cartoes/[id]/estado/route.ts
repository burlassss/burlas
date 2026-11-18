import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";

const schema = z.object({ estado: z.enum(["ativo", "congelado", "cancelado"]) });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "cartoes.gerir")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const { id } = await ctx.params;
  const card = await db.findCard(id);
  if (!card) return NextResponse.json({ erro: "Cartão não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Estado inválido." }, { status: 422 });

  await db.updateCard(card.id, { estado: parsed.data.estado });
  await db.insertAudit({ ator: admin.id, acao: `cartao.${parsed.data.estado}`, entidade: "cards", entidade_id: card.id, dados: { anterior: card.estado } });
  return NextResponse.json({ ok: true });
}
