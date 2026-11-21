import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import { configuracaoNotifica } from "@/lib/integrations/notifica";

export async function GET() {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "integracoes.ver")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  const { token, apiUrl } = await configuracaoNotifica();
  if (!token) return NextResponse.json({ erro: "Configura primeiro o token API." }, { status: 422 });
  const base = new URL(apiUrl);
  const endpoint = `${base.origin}/api/v1/senders`;
  try {
    const r = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000), cache: "no-store" });
    const data = await r.json().catch(() => null);
    if (!r.ok || data?.success === false) return NextResponse.json({ erro: data?.message ?? `Notifica respondeu HTTP ${r.status}.` }, { status: 502 });
    const senders = data?.data?.sms ?? data?.sms ?? [];
    return NextResponse.json({ senders: Array.isArray(senders) ? senders : [] });
  } catch { return NextResponse.json({ erro: "Não foi possível contactar a Notifica." }, { status: 502 }); }
}
