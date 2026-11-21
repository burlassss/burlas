import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { configuracaoNotifica } from "@/lib/integrations/notifica";

export async function GET() {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "integracoes.ver")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  const c = await configuracaoNotifica();
  return NextResponse.json({ configured: Boolean(c.token), apiUrl: c.apiUrl, senderId: c.remetente, tokenConfigured: Boolean(c.token), source: process.env.NOTIFICA_API_TOKEN || process.env.NOTIFICA_API_KEY ? "environment" : "panel" });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "integracoes.ver")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  const body = await req.json().catch(() => null) as { token?: unknown; apiUrl?: unknown; senderId?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const apiUrl = typeof body?.apiUrl === "string" ? body.apiUrl.trim() : "";
  const senderId = typeof body?.senderId === "string" ? body.senderId.trim() : "";
  if (apiUrl && (!apiUrl.startsWith("https://") || !apiUrl.includes("api.notifica.co.mz"))) return NextResponse.json({ erro: "Usa um endpoint HTTPS da API Notifica." }, { status: 422 });
  if (senderId && !/^[A-Za-z0-9_-]{1,20}$/.test(senderId)) return NextResponse.json({ erro: "Sender ID inválido." }, { status: 422 });
  if (token) await db.setSetting("notifica_token", encryptSecret(token));
  if (apiUrl) await db.setSetting("notifica_url", apiUrl);
  if (senderId) await db.setSetting("notifica_remetente", senderId);
  await db.insertAudit({ ator: admin.id, acao: "integracao.notifica.configurada", entidade: "integrations", entidade_id: null, dados: { tokenAtualizado: Boolean(token), senderId: Boolean(senderId), apiUrl: Boolean(apiUrl) } });
  return NextResponse.json({ ok: true });
}
