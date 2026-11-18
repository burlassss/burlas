import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";

const schema = z.object({
  nome: z.string().trim().min(3).max(80).optional(),
  descricao: z.string().trim().max(400).optional(),
  taxa_ativacao_usd: z.number().min(0).max(1000).optional(),
  mensalidade_usd: z.number().min(0).max(1000).optional(),
  limite_gasto_usd: z.number().min(1).max(1_000_000).optional(),
  limite_carga_usd: z.number().min(1).max(1_000_000).optional(),
  validade_meses: z.number().int().min(1).max(120).optional(),
  ordem: z.number().int().min(0).max(99).optional(),
  ativo: z.boolean().optional(),
  destaque: z.boolean().optional(),
  cor: z.string().optional(),
  icone: z.string().optional(),
  beneficios: z.array(z.string()).optional(),
  moedas: z.array(z.string()).optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "planos.gerir")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const { id } = await ctx.params;
  const plan = await db.findPlan(id);
  if (!plan) return NextResponse.json({ erro: "Plano não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });

  const atualizado = await db.updatePlan(id, parsed.data);
  await db.insertAudit({ ator: admin.id, acao: "plano.atualizado", entidade: "plans", entidade_id: id, dados: parsed.data });
  return NextResponse.json({ ok: true, plano: atualizado });
}
