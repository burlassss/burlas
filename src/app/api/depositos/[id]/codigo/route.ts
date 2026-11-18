import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { submeterCodigoDeposito } from "@/lib/services/operations";

const schema = z.object({ codigo: z.string().trim().min(5, "Código demasiado curto.").max(32) });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Código inválido." }, { status: 422 });

  const resultado = await submeterCodigoDeposito(user, id, parsed.data.codigo);
  if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: 400 });
  return NextResponse.json({ ok: true, estado: resultado.deposit?.estado });
}
