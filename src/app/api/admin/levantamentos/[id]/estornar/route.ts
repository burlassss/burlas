import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import { estornarLevantamento } from "@/lib/services/operations";

const schema = z.object({ motivo: z.string().trim().min(5, "Indica o motivo do estorno.").max(280) });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "levantamentos.gerir")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Motivo inválido." }, { status: 422 });

  const resultado = await estornarLevantamento(admin.id, id, parsed.data.motivo);
  if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: 400 });
  return NextResponse.json({ ok: true });
}
