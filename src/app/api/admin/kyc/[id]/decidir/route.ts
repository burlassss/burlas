import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { temPermissao } from "@/lib/permissions";
import { notificar } from "@/lib/services/notify";

const schema = z.object({
  acao: z.enum(["aprovar", "rejeitar"]),
  motivo: z.string().trim().max(300).optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "kyc.gerir")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Pedido inválido." }, { status: 422 });

  const subs = await db.listKycSubmissions();
  const sub = subs.find((s) => s.id === id);
  if (!sub) return NextResponse.json({ erro: "Submissão não encontrada." }, { status: 404 });
  if (sub.estado !== "pendente") return NextResponse.json({ erro: "Esta submissão já foi decidida." }, { status: 409 });

  if (parsed.data.acao === "rejeitar" && !parsed.data.motivo?.trim()) {
    return NextResponse.json({ erro: "Indica o motivo da recusa (o cliente lê esta mensagem)." }, { status: 422 });
  }

  const decididoEm = new Date().toISOString();
  const atualizada = await db.updateKycSubmission(id, {
    estado: parsed.data.acao === "aprovar" ? "aprovada" : "rejeitada",
    motivo_recusa: parsed.data.acao === "rejeitar" ? parsed.data.motivo!.trim() : null,
    decidido_em: decididoEm,
    decidido_por: admin.id,
  });

  await notificar(
    sub.user_id,
    parsed.data.acao === "aprovar"
      ? { tipo: "kyc_aprovado", titulo: "Identidade verificada", corpo: "A tua identidade foi verificada. O teu limite diário foi aumentado." }
      : { tipo: "kyc_rejeitado", titulo: "Verificação recusada", corpo: `Motivo: ${parsed.data.motivo!.trim()}. Podes corrigir e submeter novamente.` },
  );
  await db.insertAudit({ ator: admin.id, acao: parsed.data.acao === "aprovar" ? "kyc.aprovado" : "kyc.rejeitado", entidade: "kyc_submissions", entidade_id: id, dados: { motivo: parsed.data.motivo ?? null } });

  return NextResponse.json({ ok: true, submissao: atualizada });
}
