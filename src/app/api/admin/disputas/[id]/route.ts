import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import { notificar } from "@/lib/services/notify";

const schema = z.object({
  estado: z.enum(["em_analise", "resolvida", "recusada"]),
  resolucao: z.string().trim().max(2000).optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "disputas.gerir")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const { id } = await ctx.params;
  const disputa = await db.findDispute(id);
  if (!disputa) return NextResponse.json({ erro: "Disputa não encontrada." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Dados inválidos." }, { status: 422 });
  if ((parsed.data.estado === "resolvida" || parsed.data.estado === "recusada") && !parsed.data.resolucao?.trim()) {
    return NextResponse.json({ erro: "Indica a resolução da disputa." }, { status: 422 });
  }

  await db.updateDispute(id, {
    estado: parsed.data.estado,
    resolucao: parsed.data.resolucao ?? null,
    resolvida_em: parsed.data.estado === "em_analise" ? null : new Date().toISOString(),
  });
  await notificar(disputa.user_id, {
    tipo: "disputa_resolvida",
    titulo: parsed.data.estado === "em_analise" ? "Disputa em análise" : "Disputa atualizada",
    corpo: parsed.data.resolucao ? `Resolução: ${parsed.data.resolucao}` : "A tua disputa está a ser analisada pela equipa MOZOUT.",
  });
  await db.insertAudit({ ator: admin.id, acao: `disputa.${parsed.data.estado}`, entidade: "disputes", entidade_id: id, dados: { resolucao: parsed.data.resolucao } });
  return NextResponse.json({ ok: true });
}
