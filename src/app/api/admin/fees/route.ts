import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";

const schema = z.object({
  chave: z.string().trim().min(3).max(60),
  valor: z.number().min(0).max(10000),
  moeda: z.string().trim().max(8).optional(),
  ativo: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "taxas.gerir")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Dados inválidos." }, { status: 422 });

  const fees = await db.listFees();
  const existente = fees.find((f) => f.chave === parsed.data.chave);
  const fee = await db.upsertFee(parsed.data.chave, parsed.data.valor, parsed.data.moeda ?? existente?.moeda ?? "USD", parsed.data.ativo ?? existente?.ativo ?? true);
  await db.insertAudit({ ator: admin.id, acao: "taxa.alterada", entidade: "fees", entidade_id: fee.id, dados: { chave: fee.chave, valor: fee.valor, ativo: fee.ativo } });
  return NextResponse.json({ ok: true, fee });
}
