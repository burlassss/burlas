import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { cotarDepositoMobile } from "@/lib/services/operations";

/** Pré-visualização da conversão MZN→USD (com margem) e taxas. Não cria nada. */
export async function GET(req: NextRequest) {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const metodo = searchParams.get("metodo");
  const mzn = Number(searchParams.get("mzn"));
  if (metodo !== "mpesa" && metodo !== "emola") return NextResponse.json({ erro: "Método inválido." }, { status: 422 });
  if (!Number.isFinite(mzn) || mzn < 100) return NextResponse.json({ erro: "Valor mínimo MT 100,00." }, { status: 422 });

  const cotacao = await cotarDepositoMobile(metodo, Math.round(mzn * 100));
  return NextResponse.json(cotacao);
}
