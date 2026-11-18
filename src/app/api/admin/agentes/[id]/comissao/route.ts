import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";

const schema = z.object({ pct: z.number().min(0.1).max(10) });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "agentes.gerir")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const { id } = await ctx.params;
  const agente = await db.findAgent(id);
  if (!agente) return NextResponse.json({ erro: "Agente não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Comissão deve estar entre 0.1% e 10%." }, { status: 422 });

  await db.updateAgent(agente.id, { comissao_pct: parsed.data.pct });
  await db.insertAudit({ ator: admin.id, acao: "agente.comissao", entidade: "agents", entidade_id: agente.id, dados: { pct: parsed.data.pct, anterior: agente.comissao_pct } });
  return NextResponse.json({ ok: true });
}
