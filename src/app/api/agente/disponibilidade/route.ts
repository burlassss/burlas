import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAgente } from "@/lib/auth";

const schema = z.object({ disponivel: z.boolean() });

export async function POST(req: NextRequest) {
  const user = await requireAgente();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Dados inválidos." }, { status: 422 });

  const agente = await db.findAgentByUserId(user.id);
  if (!agente) return NextResponse.json({ erro: "Perfil de agente não encontrado." }, { status: 404 });

  await db.updateAgent(agente.id, { disponivel: parsed.data.disponivel });
  await db.insertAudit({ ator: user.id, acao: "agente.disponibilidade", entidade: "agents", entidade_id: agente.id, dados: { disponivel: parsed.data.disponivel } });
  return NextResponse.json({ ok: true, disponivel: parsed.data.disponivel });
}
