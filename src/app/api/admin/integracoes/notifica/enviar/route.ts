import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import { enviarSms } from "@/lib/integrations/notifica";
import { db } from "@/lib/db";

const schema = z.object({ numeros: z.array(z.string().trim()).min(1).max(100), mensagem: z.string().trim().min(1).max(500), confirm: z.literal(true) });
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "integracoes.ver")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erro: "Indica números válidos, mensagem e confirma o envio. Limite: 100 destinatários por campanha." }, { status: 422 });
  const numeros = [...new Set(parsed.data.numeros.map((n) => n.replace(/[\s()-]/g, "")))];
  if (numeros.some((n) => !/^\+?[1-9]\d{7,14}$/.test(n))) return NextResponse.json({ erro: "Um ou mais números não estão no formato internacional (ex.: +258841234567)." }, { status: 422 });
  const resultados: { numero: string; ok: boolean; erro?: string }[] = [];
  for (const numero of numeros) {
    const r = await enviarSms(numero, parsed.data.mensagem.slice(0, 1600));
    resultados.push({ numero, ok: r.ok, ...(r.erro ? { erro: r.erro } : {}) });
  }
  await db.insertAudit({ ator: admin.id, acao: "integracao.notifica.campanha", entidade: "integrations", entidade_id: null, dados: { total: resultados.length, enviados: resultados.filter((r) => r.ok).length, falhas: resultados.filter((r) => !r.ok).length } });
  return NextResponse.json({ ok: resultados.every((r) => r.ok), resultados });
}
