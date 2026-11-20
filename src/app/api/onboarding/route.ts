import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const OPCOES = ["mercado_financeiro", "compras_online", "criptomoeda", "assinaturas", "outros"] as const;
const METODOS = ["mpesa_emola", "transferencia_bancaria", "cartao_estrangeiro", "criptomoeda", "dinheiro_informal", "nenhum"] as const;

const schema = z.object({
  usos: z.array(z.enum(OPCOES)).min(1, "Escolhe pelo menos uma opção.").max(5),
  metodos_antes: z.array(z.enum(METODOS)).min(1, "Escolhe pelo menos uma opção.").max(6),
});

/** Guarda (ou atualiza) as respostas de onboarding do utilizador. */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });

  const resposta = await db.upsertOnboardingAnswer(user.id, parsed.data.usos, parsed.data.metodos_antes);
  await db.insertAudit({ ator: user.id, acao: "onboarding.respondido", entidade: "onboarding_answers", entidade_id: resposta.id, dados: { usos: resposta.usos, metodos_antes: resposta.metodos_antes } });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const user = await requireUser();
  const resposta = await db.findOnboardingAnswer(user.id);
  return NextResponse.json({ resposta });
}
