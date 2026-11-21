import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import { enviarSms } from "@/lib/integrations/notifica";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "integracoes.ver")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  const body = await req.json().catch(() => null) as { numero?: unknown; mensagem?: unknown } | null;
  const numero = typeof body?.numero === "string" ? body.numero.trim() : "";
  const mensagem = typeof body?.mensagem === "string" ? body.mensagem.trim() : "";
  if (!/^\+?[1-9]\d{7,14}$/.test(numero.replace(/[\s()-]/g, "")) || !mensagem || mensagem.length > 1600) return NextResponse.json({ erro: "Número internacional ou mensagem inválida." }, { status: 422 });
  const result = await enviarSms(numero, mensagem);
  await db.insertAudit({ ator: admin.id, acao: "integracao.notifica.teste", entidade: "integrations", entidade_id: null, dados: { ok: result.ok, simulado: result.simulado } });
  return NextResponse.json({ ok: result.ok, simulado: result.simulado, erro: result.erro }, { status: result.ok ? 200 : 502 });
}
