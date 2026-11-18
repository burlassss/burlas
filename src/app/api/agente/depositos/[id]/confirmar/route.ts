import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAgente } from "@/lib/auth";
import { agenteConfirmarDeposito } from "@/lib/services/operations";

const schema = z.object({ nota: z.string().trim().max(280).optional() });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireAgente();
  const { id } = await ctx.params;
  const agente = await db.findAgentByUserId(user.id);
  if (!agente) return NextResponse.json({ erro: "Perfil de agente não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const resultado = await agenteConfirmarDeposito(agente, id, parsed.success ? parsed.data.nota : undefined);
  if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: 400 });
  return NextResponse.json({ ok: true });
}
