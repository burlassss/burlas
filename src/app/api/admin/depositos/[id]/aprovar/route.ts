import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import { aprovarDeposito } from "@/lib/services/operations";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "depositos.aprovar")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const { id } = await ctx.params;
  const resultado = await aprovarDeposito(admin.id, id);
  if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: 400 });
  return NextResponse.json({ ok: true });
}
