import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";

const schema = z.object({
  valor: z.number().min(1, "Cotação inválida.").max(1000),
  margem: z.number().min(0).max(20),
});

/** Regista uma nova cotação USD/MZN (as antigas ficam no histórico). */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "taxas.gerir")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Valores inválidos." }, { status: 422 });

  const rate = await db.insertRate({ par: "USD/MZN", valor: parsed.data.valor, margem: parsed.data.margem, criado_por: admin.id });
  await db.insertAudit({ ator: admin.id, acao: "cotacao.alterada", entidade: "rates", entidade_id: rate.id, dados: { par: "USD/MZN", valor: rate.valor, margem: rate.margem } });
  return NextResponse.json({ ok: true, rate });
}
