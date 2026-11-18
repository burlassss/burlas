import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";

const schema = z.object({ estado: z.enum(["pendente", "ativo", "suspenso", "inativo"]) });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "agentes.gerir")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const { id } = await ctx.params;
  const agente = await db.findAgent(id);
  if (!agente) return NextResponse.json({ erro: "Agente não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Estado inválido." }, { status: 422 });

  await db.updateAgent(agente.id, { estado: parsed.data.estado, disponivel: parsed.data.estado === "ativo" });
  await db.insertAudit({ ator: admin.id, acao: `agente.${parsed.data.estado}`, entidade: "agents", entidade_id: agente.id, dados: { anterior: agente.estado } });
  return NextResponse.json({ ok: true });
}
