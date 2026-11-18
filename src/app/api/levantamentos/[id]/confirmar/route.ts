import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { clienteConfirmarLevantamento } from "@/lib/services/operations";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await ctx.params;
  const resultado = await clienteConfirmarLevantamento(user, id);
  if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: 400 });
  return NextResponse.json({ ok: true });
}
