import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { emitirCartao } from "@/lib/services/cards";

const schema = z.object({ planId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Plano inválido." }, { status: 422 });

  const plan = await db.findPlan(parsed.data.planId);
  if (!plan || !plan.ativo) return NextResponse.json({ erro: "Este plano não está disponível." }, { status: 404 });

  // Um cartão por plano
  const existentes = await db.listCardsByUser(user.id);
  if (existentes.some((c) => c.plan_id === plan.id && c.estado !== "cancelado")) {
    return NextResponse.json({ erro: "Já tens um cartão deste plano." }, { status: 409 });
  }

  try {
    const { card } = await emitirCartao(user, plan);
    return NextResponse.json({ ok: true, cardId: card.id });
  } catch (err) {
    if (err instanceof Error && err.message === "SALDO_INSUFICIENTE") {
      return NextResponse.json({ erro: `Saldo insuficiente. Precisas de $${plan.taxa_ativacao_usd.toFixed(2)} para ativar este cartão. Deposita primeiro.` }, { status: 402 });
    }
    console.error("[solicitar-cartao]", err);
    return NextResponse.json({ erro: "Não foi possível emitir o cartão. Tenta novamente." }, { status: 500 });
  }
}
