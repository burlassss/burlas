/**
 * Adaptador da API Notifica (SMS).
 * O token fica exclusivamente no servidor. Sem token configurado,
 * os SMS são simulados e registados nos logs (modo demonstração).
 */

export interface SmsResult {
  ok: boolean;
  simulado: boolean;
  provedorId?: string;
  erro?: string;
}

export async function configuracaoNotifica() {
  const settings = await (await import("@/lib/db")).db.listSettings();
  const get = (key: string) => settings.find((s) => s.chave === `notifica_${key}`)?.valor;
  const tokenGuardado = get("token");
  const { decryptSecret } = await import("@/lib/crypto");
  const tokenEnv = (process.env.NOTIFICA_API_TOKEN || process.env.NOTIFICA_API_KEY)?.trim();
  return {
    token: tokenEnv || (tokenGuardado ? decryptSecret(tokenGuardado) : ""),
    apiUrl: process.env.NOTIFICA_API_URL?.trim() || get("url")?.trim() || "https://api.notifica.co.mz/api/v1/sms/send",
    remetente: (process.env.NOTIFICA_REMETENTE || process.env.NOTIFICA_SENDER)?.trim() || get("remetente")?.trim() || "MOZOUT",
  };
}

export async function enviarSms(destino: string, texto: string): Promise<SmsResult> {
  const { token, apiUrl, remetente } = await configuracaoNotifica();

  if (!token) {
    console.info(`[SMS simulado] para ${destino}: ${texto}`);
    return { ok: true, simulado: true, provedorId: `demo-${Date.now()}` };
  }

  try {
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ source_addr: remetente, to: destino.replace(/[^+\d]/g, "").replace(/^\+/, ""), message: texto }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      const corpo = await resp.text().catch(() => "");
      console.error(`[Notifica] HTTP ${resp.status}: ${corpo}`);
      return { ok: false, simulado: false, erro: `HTTP ${resp.status}` };
    }
    const data = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
    if (data.success === false) {
      const erro = typeof data.message === "string" ? data.message : "A API Notifica recusou o envio.";
      return { ok: false, simulado: false, erro };
    }
    const nested = data.data && typeof data.data === "object" ? data.data as Record<string, unknown> : {};
    return { ok: true, simulado: false, provedorId: String(nested.id ?? data.id ?? data.messageId ?? "") };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Notifica] falha no envio: ${msg}`);
    return { ok: false, simulado: false, erro: msg };
  }
}
