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

export async function enviarSms(destino: string, texto: string): Promise<SmsResult> {
  const token = process.env.NOTIFICA_API_TOKEN?.trim();
  const apiUrl = process.env.NOTIFICA_API_URL?.trim() || "https://api.notifica.co.mz/v1/send";
  const remetente = process.env.NOTIFICA_REMETENTE?.trim() || "MOZOUT";

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
      body: JSON.stringify({ from: remetente, to: destino, message: texto }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      const corpo = await resp.text().catch(() => "");
      console.error(`[Notifica] HTTP ${resp.status}: ${corpo}`);
      return { ok: false, simulado: false, erro: `HTTP ${resp.status}` };
    }
    const data = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: true, simulado: false, provedorId: String(data.id ?? data.messageId ?? "") };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Notifica] falha no envio: ${msg}`);
    return { ok: false, simulado: false, erro: msg };
  }
}
