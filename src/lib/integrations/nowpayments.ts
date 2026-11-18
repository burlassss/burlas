/**
 * Adaptador NOWPayments (depósitos USDT TRC20).
 * Documentação IPN: a assinatura HMAC-SHA512 é calculada sobre o JSON
 * com as chaves ordenadas alfabeticamente, usando NOWPAYMENTS_IPN_SECRET.
 */
import crypto from "node:crypto";

export interface PagamentoCriado {
  provedorRef: string;
  endereco: string;
  valorCrypto: string;
  payCurrency: string;
  simulado: boolean;
}

export async function criarPagamentoUsdt(params: { valorUsd: number; referencia: string }): Promise<PagamentoCriado> {
  const apiKey = process.env.NOWPAYMENTS_API_KEY?.trim();
  const apiUrl = process.env.NOWPAYMENTS_API_URL?.trim() || "https://api.nowpayments.io/v1";

  if (!apiKey) {
    // Modo demonstração — endereço fictício mas realista (TRC20 começa por T)
    const endereco = `T${crypto.randomBytes(16).toString("hex").slice(0, 33).toUpperCase()}`;
    return {
      provedorRef: `demo-np-${Date.now()}`,
      endereco,
      valorCrypto: params.valorUsd.toFixed(2),
      payCurrency: "usdttrc20",
      simulado: true,
    };
  }

  const resp = await fetch(`${apiUrl}/payment`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: params.valorUsd,
      price_currency: "usd",
      pay_currency: "usdttrc20",
      ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/webhooks/nowpayments`,
      order_id: params.referencia,
      order_description: `MOZOUT-USD depósito ${params.referencia}`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) {
    const corpo = await resp.text().catch(() => "");
    throw new Error(`NOWPayments HTTP ${resp.status}: ${corpo}`);
  }
  const data = (await resp.json()) as Record<string, unknown>;
  return {
    provedorRef: String(data.payment_id ?? ""),
    endereco: String(data.pay_address ?? ""),
    valorCrypto: String(data.pay_amount ?? params.valorUsd),
    payCurrency: "usdttrc20",
    simulado: false,
  };
}

function sortObject(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortObject);
  if (obj && typeof obj === "object") {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortObject((obj as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return obj;
}

/** Verifica a assinatura x-nowpayments-sig de um webhook IPN. */
export function verificarAssinaturaIpn(rawBody: string, assinatura: string | null): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET?.trim();
  if (!secret) return false;
  if (!assinatura) return false;
  try {
    const payload = sortObject(JSON.parse(rawBody));
    const esperado = crypto.createHmac("sha512", secret).update(JSON.stringify(payload)).digest("hex");
    const a = Buffer.from(assinatura, "utf8");
    const b = Buffer.from(esperado, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
