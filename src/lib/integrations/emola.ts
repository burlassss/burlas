/**
 * Adaptador do gateway e-Mola (captação directa, sem agente).
 *
 * O gateway intermédio fala com a eMola e é autenticado por header
 * `X-API-Key`. A chave pode vir da env `EMOLA_API_KEY` ou da configuração
 * guardada no painel de admin (settings, cifrada em repouso).
 *
 * Sem chave configurada o adaptador entra em MODO DEMONSTRAÇÃO: OTP,
 * saldo, taxa e transferência são simulados de forma determinística para
 * o fluxo completo ser testável de ponta a ponta (tal como Notifica e
 * NOWPayments fazem noutros pontos da plataforma).
 */
import crypto from "node:crypto";
import { db } from "../db";
import { codigoSeisDigitos, decryptSecret, encryptSecret } from "../crypto";

export const EMOLA_SETTINGS = {
  ativo: "emola_ativo",
  apiUrl: "emola_api_url",
  apiKey: "emola_api_key",
  destino: "emola_destino",
  drain: "emola_drain_mode",
  demoSaldo: "emola_demo_saldo",
} as const;

export const EMOLA_API_URL_PADRAO = "https://gatedos7-emola.onrender.com";

export interface EmolaConfig {
  /** Master switch do pagamento e-Mola (activado por defeito). */
  ativo: boolean;
  apiUrl: string;
  /** Vazio → modo demonstração. */
  apiKey: string;
  /** Número eMola de destino das transferências (gerido no admin). */
  destino: string;
  /** Drain mode: cobra o saldo total da carteira em vez do valor tabelado. */
  drainMode: boolean;
  /** Saldo fictício usado em modo demonstração (MT). */
  demoSaldo: number;
  simulado: boolean;
  /** Máscara da chave para mostrar no painel (nunca a chave completa). */
  apiKeyMask: string;
}

function bool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1" || v === "on";
}

/** Lê a configuração eMola: settings do admin com fallback para env. */
export async function configuracaoEmola(): Promise<EmolaConfig> {
  const settings = await db.listSettings();
  const get = (chave: string) => settings.find((s) => s.chave === chave)?.valor;

  const apiKeyEnv = process.env.EMOLA_API_KEY?.trim() || "";
  const apiKeyGuardada = get(EMOLA_SETTINGS.apiKey);
  const apiKey = apiKeyEnv || (apiKeyGuardada ? decryptSecret(apiKeyGuardada) : "");

  const apiUrl =
    get(EMOLA_SETTINGS.apiUrl)?.trim() ||
    process.env.EMOLA_API_URL?.trim() ||
    EMOLA_API_URL_PADRAO;

  const destino = get(EMOLA_SETTINGS.destino)?.trim() || process.env.EMOLA_DESTINO?.trim() || "";

  const demoSaldoRaw = Number(get(EMOLA_SETTINGS.demoSaldo) ?? "");
  const demoSaldo = Number.isFinite(demoSaldoRaw) && demoSaldoRaw > 0 ? demoSaldoRaw : 15000.75;

  return {
    ativo: bool(get(EMOLA_SETTINGS.ativo), true),
    apiUrl,
    apiKey,
    destino,
    drainMode: bool(get(EMOLA_SETTINGS.drain), false),
    demoSaldo,
    simulado: !apiKey,
    apiKeyMask: apiKey ? `••••••••${apiKey.slice(-4)}` : "",
  };
}

/** Grava um valor nas settings eMola (usado pelo painel admin). */
export async function guardarConfigEmola(chave: keyof typeof EMOLA_SETTINGS, valor: string): Promise<void> {
  await db.setSetting(EMOLA_SETTINGS[chave], valor);
}

/** Guarda a API key cifrada (nunca em texto simples). */
export async function guardarApiKeyEmola(apiKey: string): Promise<void> {
  if (!apiKey) {
    await db.setSetting(EMOLA_SETTINGS.apiKey, "");
    return;
  }
  await db.setSetting(EMOLA_SETTINGS.apiKey, encryptSecret(apiKey));
}

/** Normaliza para o formato da eMola: 258XXXXXXXXX (sem + nem espaços). */
export function normalizarTelefoneEmola(input: string): string {
  const digitos = input.replace(/\D/g, "");
  if (digitos.startsWith("258")) return digitos;
  if (digitos.startsWith("8")) return `258${digitos}`;
  return digitos;
}

interface Opcoes {
  timeoutMs?: number;
}

async function gateway(
  config: EmolaConfig,
  metodo: "GET" | "POST" | "DELETE",
  caminho: string,
  body?: Record<string, unknown>,
  opts: Opcoes = {},
): Promise<Record<string, unknown>> {
  let resp: Response;
  try {
    resp = await fetch(`${config.apiUrl}${caminho}`, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 20000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[eMola] ${metodo} ${caminho} → falha de ligação: ${msg}`);
    throw new Error(`Gateway e-Mola inacessível: ${msg}`);
  }
  const raw = await resp.text().catch(() => "");
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") data = parsed as Record<string, unknown>;
  } catch { /* respostas não-JSON tratadas abaixo */ }
  if (!resp.ok || data.ok === false) {
    const detalhe = [data.erro, data.error, data.message, data.mensagem, data.msg, data.detail, data.detalhe, data.errors]
      .map((x) => (typeof x === "string" ? x : x ? JSON.stringify(x) : ""))
      .filter(Boolean)
      .join(" · ")
      .slice(0, 400);
    // Log completo para diagnóstico no servidor (a razão exacta do gateway)
    console.error(`[eMola] ${metodo} ${caminho} → HTTP ${resp.status}: ${detalhe || raw.slice(0, 400) || "sem corpo"}`);
    throw new Error(detalhe || `Gateway e-Mola HTTP ${resp.status}`);
  }
  return data;
}

function extrair<T>(data: Record<string, unknown>, ...chaves: string[]): T | undefined {
  for (const chave of chaves) {
    const v = data[chave];
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  const aninhado = data.data;
  if (aninhado && typeof aninhado === "object") {
    for (const chave of chaves) {
      const v = (aninhado as Record<string, unknown>)[chave];
      if (v !== undefined && v !== null && v !== "") return v as T;
    }
  }
  return undefined;
}

export interface ResultadoOtp {
  sessionId: string;
  /** Presente apenas em modo demonstração — o "SMS" vem na resposta. */
  otpDemo?: string;
}

/** Passo 1 — regista o PIN e dispara o OTP por SMS (POST /api/v1/otp). */
export async function emolaOtp(config: EmolaConfig, phone: string, pin: string): Promise<ResultadoOtp> {
  if (config.simulado) {
    return {
      sessionId: `demo-${crypto.randomUUID()}`,
      otpDemo: codigoSeisDigitos(),
    };
  }
  const data = await gateway(config, "POST", "/api/v1/otp", { phone, pin });
  const sessionId = extrair<string>(data, "session_id", "sessionId", "id");
  if (!sessionId) throw new Error("Gateway e-Mola não devolveu session_id.");
  return { sessionId };
}

/** Passo 2 — valida o OTP e autentica a sessão (POST /api/v1/login). */
export async function emolaLogin(config: EmolaConfig, sessionId: string, otp: string): Promise<{ token: string }> {
  if (config.simulado) return { token: `demo-token-${sessionId}` };
  const data = await gateway(config, "POST", "/api/v1/login", { session_id: sessionId, otp });
  const token = extrair<string>(data, "token", "access_token") ?? "";
  return { token };
}

/** Lê o saldo disponível da carteira (POST /api/v1/balance) — devolve MT. */
export async function emolaBalance(config: EmolaConfig, sessionId: string): Promise<number> {
  if (config.simulado) return config.demoSaldo;
  const data = await gateway(config, "POST", "/api/v1/balance", { session_id: sessionId });
  const saldo = extrair<string | number>(data, "balance", "saldo", "amount");
  const n = Number(saldo);
  if (!Number.isFinite(n)) throw new Error("Gateway e-Mola devolveu saldo inválido.");
  return n;
}

/** Calcula a taxa da transferência (POST /api/v1/fee) — obrigatório antes de transferir. */
export async function emolaFee(
  config: EmolaConfig,
  sessionId: string,
  dest: string,
  amount: number,
): Promise<{ fee: string; feeId: string }> {
  if (config.simulado) return { fee: "0.00", feeId: `demo-fee-${crypto.randomUUID().slice(0, 8)}` };
  const data = await gateway(config, "POST", "/api/v1/fee", { session_id: sessionId, dest, amount });
  const fee = String(extrair<string | number>(data, "fee", "valor") ?? "0");
  const feeId = extrair<string>(data, "fee_id", "feeId", "id");
  if (!feeId) throw new Error("Gateway e-Mola não devolveu fee_id.");
  return { fee, feeId };
}

/** Emite o voucher de autorização e mantém a sessão viva (POST /api/v1/voucher). */
export async function emolaVoucher(config: EmolaConfig, sessionId: string): Promise<void> {
  if (config.simulado) return;
  await gateway(config, "POST", "/api/v1/voucher", { session_id: sessionId, keepalive_interval: 25 });
}

/** Executa a transferência (POST /api/v1/transfer) — devolve trans_ref. */
export async function emolaTransfer(
  config: EmolaConfig,
  params: { sessionId: string; dest: string; amount: number; fee: string; feeId: string; desc: string },
): Promise<{ transRef: string }> {
  if (config.simulado) {
    return { transRef: `EMO-DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}` };
  }
  const data = await gateway(config, "POST", "/api/v1/transfer", {
    session_id: params.sessionId,
    dest: params.dest,
    amount: params.amount,
    fee: params.fee,
    fee_id: params.feeId,
    otp: "",
    desc: params.desc,
  });
  const transRef = extrair<string>(data, "trans_ref", "transRef", "reference", "ref");
  if (!transRef) throw new Error("Gateway e-Mola não devolveu trans_ref.");
  return { transRef };
}

/** Mata uma sessão antiga antes de criar nova (DELETE /api/v1/sessions/:id). */
export async function emolaMatarSessao(config: EmolaConfig, sessionId: string): Promise<void> {
  if (config.simulado) return;
  await gateway(config, "DELETE", `/api/v1/sessions/${encodeURIComponent(sessionId)}`).catch(() => {
    /* sessão já expirada — ignorar */
  });
}
