import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import { resolverTema } from "@/lib/themes";
import type { PlanoTier } from "@/lib/db/types";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (usa #rrggbb).");
const temaSchema = z.object({
  bg: hex.optional(), surface: hex.optional(), ink: hex.optional(),
  primary: hex.optional(), primary2: hex.optional(), primary3: hex.optional(),
  accent: hex.optional(), accentStrong: hex.optional(), accentSoft: hex.optional(),
  mist: hex.optional(), sand: hex.optional(),
}).strict();

const schema = z.object({
  nome: z.string().trim().min(3).max(80).optional(),
  tier: z.enum(["standard", "platina", "gold"]).optional(),
  tema: temaSchema.nullable().optional(),
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

  try {
    const patch: Record<string, unknown> = { ...parsed.data };
    const tierFinal = (parsed.data.tier ?? plan.tier ?? "standard") as PlanoTier;
    if (parsed.data.tema !== undefined) {
      patch.tema = parsed.data.tema === null ? null : resolverTema(tierFinal, parsed.data.tema);
    } else if (parsed.data.tier && plan.tema) {
      patch.tema = resolverTema(tierFinal, plan.tema);
    }
    const atualizado = await db.updatePlan(id, patch as Parameters<typeof db.updatePlan>[1]);
    await db.insertAudit({ ator: admin.id, acao: "plano.atualizado", entidade: "plans", entidade_id: id, dados: parsed.data });
    return NextResponse.json({ ok: true, plano: atualizado });
  } catch (err) {
    console.error("[admin/planos PATCH]", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido.";
    const dica = /tier|tema|column|check/i.test(msg) ? " A base de dados precisa da migração 0003 (níveis standard/platina/gold). Contacta a equipa técnica." : "";
    return NextResponse.json({ erro: `Não foi possível guardar o plano.${dica}` }, { status: 500 });
  }
}
