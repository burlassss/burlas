import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import { enviarSms } from "@/lib/integrations/notifica";

/** Envia um SMS de teste para o telefone do administrador autenticado. */
export async function POST() {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "integracoes.ver")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const resultado = await enviarSms(admin.telefone, "MOZOUT-USD · Teste de integração Notifica. Se recebeste esta mensagem, o canal SMS está operacional.");
  await db.insertAudit({ ator: admin.id, acao: "integracao.teste_sms", entidade: "integrations", entidade_id: null, dados: { ok: resultado.ok, simulado: resultado.simulado } });

  return NextResponse.json({ ok: resultado.ok, simulado: resultado.simulado, erro: resultado.erro });
}
