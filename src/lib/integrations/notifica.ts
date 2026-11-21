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
    const raw = await resp.text().catch(() => "");
    let data: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") data = parsed as Record<string, unknown>;
    } catch { /* respostas não JSON são tratadas abaixo */ }
    if (!resp.ok || data.success === false) {
      const detalhe = [data.message, data.error, data.errors]
        .map((x) => typeof x === "string" ? x : x ? JSON.stringify(x) : "")
        .filter(Boolean).join(" · ").slice(0, 400);
      const status = resp.status;
      const dica = status === 401 || status === 403
        ? "Confirma que o token é válido e tem permissão para SMS."
        : status === 422 || status === 400
          ? "Confirma o Sender ID aprovado e o número em formato internacional (+258…)."
          : status === 429
            ? "A Notifica aplicou limite de envio; espera e tenta novamente."
            : status >= 500
              ? "A API Notifica está temporariamente indisponível."
              : "Confirma o endpoint, o token e o Sender ID no painel.";
      const erro = `Notifica HTTP ${status}${detalhe ? `: ${detalhe}` : "."} ${dica}`;
      console.error(`[Notifica] envio falhou (HTTP ${status}): ${detalhe || "sem mensagem do fornecedor"}`);
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
