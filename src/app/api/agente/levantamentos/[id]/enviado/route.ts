import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAgente } from "@/lib/auth";
import { agenteMarcarEnviado } from "@/lib/services/operations";

const schema = z.object({ referenciaTx: z.string().trim().min(5, "Referência demasiado curta.").max(32) });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireAgente();
  const { id } = await ctx.params;
  const agente = await db.findAgentByUserId(user.id);
  if (!agente) return NextResponse.json({ erro: "Perfil de agente não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Referência inválida." }, { status: 422 });

  const resultado = await agenteMarcarEnviado(agente, id, parsed.data.referenciaTx);
  if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: 400 });
  return NextResponse.json({ ok: true });
}
