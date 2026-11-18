import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { criarDepositoUsdt } from "@/lib/services/operations";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ valorUsd: z.number().min(10, "O mínimo são $10.00").max(5000, "O máximo por depósito são $5,000.00") });

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const rl = rateLimit(`dep-usdt:${user.id}`, 10, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ erro: "Muitos pedidos. Tenta mais tarde." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Valor inválido." }, { status: 422 });

  const deposito = await criarDepositoUsdt(user, Math.round(parsed.data.valorUsd * 100));

  return NextResponse.json({
    deposito: {
      id: deposito.id,
      referencia: deposito.referencia,
      valor_usd: deposito.valor_usd,
      valor_liquido_usd: deposito.valor_liquido_usd,
      endereco_pagamento: deposito.endereco_pagamento,
      taxa: deposito.taxa,
      estado: deposito.estado,
      criado_em: deposito.criado_em,
    },
  });
}
