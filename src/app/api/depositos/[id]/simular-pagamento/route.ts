import { NextResponse } from "next/server";
import { dataMode } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { confirmarDepositoUsdt } from "@/lib/services/operations";
import { db } from "@/lib/db";

/**
 * APENAS MODO DEMONSTRAÇÃO: simula a confirmação on-chain do USDT.
 * Em produção (Supabase), este endpoint não existe e o crédito acontece
 * exclusivamente via webhook autenticado da NOWPayments.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (dataMode() !== "demo") return NextResponse.json({ erro: "Não disponível." }, { status: 404 });

  const user = await requireUser();
  const { id } = await ctx.params;
  const deposit = await db.findDeposit(id);
  if (!deposit || deposit.user_id !== user.id) return NextResponse.json({ erro: "Depósito não encontrado." }, { status: 404 });

  const atualizado = await confirmarDepositoUsdt({ depositoId: id });
  return NextResponse.json({ ok: true, deposito: atualizado });
}
