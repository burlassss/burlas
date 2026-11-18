import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import { notificar } from "@/lib/services/notify";

const schema = z.object({
  valorUsd: z.number().min(-10000).max(10000).refine((v) => v !== 0, "O valor não pode ser zero."),
  motivo: z.string().trim().min(5, "Indica o motivo do ajuste (mín. 5 caracteres).").max(280),
});

/** Ajuste manual de saldo — lançamento no ledger, com motivo e auditoria. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "utilizadores.ajustar_saldo")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const { id } = await ctx.params;
  const target = await db.findUserById(id);
  if (!target) return NextResponse.json({ erro: "Utilizador não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });

  const referencia = `AJUSTE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  try {
    const entry = await db.applyLedger({
      userId: target.id,
      tipo: "ajuste",
      valorCents: Math.round(parsed.data.valorUsd * 100),
      moeda: "USD",
      referencia,
      descricao: `Ajuste administrativo · ${parsed.data.motivo}`,
    });
    await notificar(target.id, {
      tipo: "seguranca",
      titulo: "Ajuste de saldo",
      corpo: `A administração aplicou um ajuste de ${parsed.data.valorUsd >= 0 ? "+" : ""}$${parsed.data.valorUsd.toFixed(2)} na tua carteira. Motivo: ${parsed.data.motivo}`,
    });
    await db.insertAudit({
      ator: admin.id,
      acao: "saldo.ajustado",
      entidade: "users",
      entidade_id: target.id,
      dados: { valorUsd: parsed.data.valorUsd, motivo: parsed.data.motivo, referencia, saldo_resultante: entry.saldo_resultante },
    });
    return NextResponse.json({ ok: true, saldoResultante: entry.saldo_resultante });
  } catch (err) {
    if (err instanceof Error && err.message === "SALDO_INSUFICIENTE") {
      return NextResponse.json({ erro: "O ajuste deixaria o saldo negativo." }, { status: 400 });
    }
    throw err;
  }
}
