import { NextResponse } from "next/server";
import { cotacao } from "@/lib/services/fx";

export const dynamic = "force-dynamic";
export async function GET() {
  const atual = await cotacao();
  return NextResponse.json({ valor: atual.valorEfetivo, margemPct: atual.margemPct }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
