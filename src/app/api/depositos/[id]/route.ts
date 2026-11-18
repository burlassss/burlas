import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await ctx.params;
  const deposito = await db.findDeposit(id);
  if (!deposito || deposito.user_id !== user.id) return NextResponse.json({ erro: "Depósito não encontrado." }, { status: 404 });
  return NextResponse.json({
    id: deposito.id,
    referencia: deposito.referencia,
    metodo: deposito.metodo,
    valor_usd: deposito.valor_usd,
    valor_mzn: deposito.valor_mzn,
    valor_liquido_usd: deposito.valor_liquido_usd,
    estado: deposito.estado,
    codigo_tx: deposito.codigo_tx,
    endereco_pagamento: deposito.endereco_pagamento,
    criado_em: deposito.criado_em,
    motivo_recusa: deposito.motivo_recusa,
  });
}
