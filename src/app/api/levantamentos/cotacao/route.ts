import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { cotarLevantamento } from "@/lib/services/operations";
import type { LevantamentoMetodo } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const metodo = searchParams.get("metodo") as LevantamentoMetodo | null;
  const usd = Number(searchParams.get("usd"));
  if (metodo !== "mpesa" && metodo !== "emola" && metodo !== "usdt_trc20") {
    return NextResponse.json({ erro: "Método inválido." }, { status: 422 });
  }
  if (!Number.isFinite(usd) || usd < 5) return NextResponse.json({ erro: "Mínimo $5.00." }, { status: 422 });

  const cotacao = await cotarLevantamento(metodo, Math.round(usd * 100));
  return NextResponse.json(cotacao);
}
