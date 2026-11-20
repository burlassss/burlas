import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import { resolverTema } from "@/lib/themes";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (usa #rrggbb).");
const temaSchema = z.object({
  bg: hex.optional(), surface: hex.optional(), ink: hex.optional(),
  primary: hex.optional(), primary2: hex.optional(), primary3: hex.optional(),
  accent: hex.optional(), accentStrong: hex.optional(), accentSoft: hex.optional(),
  mist: hex.optional(), sand: hex.optional(),
}).strict();

const schema = z.object({
  nome: z.string().trim().min(3).max(80),
  tier: z.enum(["standard", "platina", "gold"]).default("standard"),
  tema: temaSchema.nullable().default(null),
  slug: z.string().trim().regex(/^[a-z0-9-]{3,60}$/, "Slug: minúsculas, números e hífens."),
  tipo: z.enum(["compras", "assinaturas", "viagem"]),
  descricao: z.string().trim().max(400).default(""),
  taxa_ativacao_usd: z.number().min(0).max(1000),
  mensalidade_usd: z.number().min(0).max(1000),
  limite_gasto_usd: z.number().min(1).max(1_000_000),
  limite_carga_usd: z.number().min(1).max(1_000_000),
  validade_meses: z.number().int().min(1).max(120),
  ordem: z.number().int().min(0).max(99).default(10),
  ativo: z.boolean().default(true),
  destaque: z.boolean().default(false),
  cor: z.string().default("from-[#101f16] via-[#173a29] to-[#0b241a]"),
  icone: z.string().default("shopping-bag"),
  beneficios: z.array(z.string()).default([]),
  moedas: z.array(z.string()).default(["USD"]),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "planos.gerir")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });

  const existe = await db.findPlanBySlug(parsed.data.slug);
  if (existe) return NextResponse.json({ erro: "Já existe um plano com este slug." }, { status: 409 });

  try {
    const { tier, tema, ...rest } = parsed.data;
    const plan = await db.insertPlan({
      ...rest,
      tier,
      tema: tema ? resolverTema(tier, tema) : null, // paleta completa resolvida
      imagem: null,
    });
    await db.insertAudit({ ator: admin.id, acao: "plano.criado", entidade: "plans", entidade_id: plan.id, dados: { slug: plan.slug } });
    return NextResponse.json({ ok: true, plano: plan });
  } catch (err) {
    console.error("[admin/planos POST]", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido.";
    const dica = /tier|tema|column/i.test(msg) ? " A base de dados precisa da migração 0003 (níveis standard/platina/gold). Contacta a equipa técnica." : "";
    return NextResponse.json({ erro: `Não foi possível criar o plano.${dica}` }, { status: 500 });
  }
}
