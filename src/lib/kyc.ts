import { db } from "./db";
import type { KycEstadoCliente, KycSubmission } from "./db/types";

/** Estado do KYC do utilizador (derivado da sua última submissão). */
export async function estadoKyc(userId: string): Promise<KycEstadoCliente> {
  const sub = await db.findLatestKycByUser(userId);
  if (!sub) return "nao_verificado";
  if (sub.estado === "aprovada") return "verificado";
  if (sub.estado === "pendente") return "pendente";
  return "rejeitada";
}

/** Limites por dia (settings com defaults do utilizador: 2.000 / 5.000). */
async function limites(): Promise<{ naoVerificadoCents: number; verificadoCents: number }> {
  const settings = await db.listSettings();
  const get = (chave: string, fallback: number) => {
    const s = settings.find((x) => x.chave === chave);
    const n = s ? Number(s.valor) : NaN;
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    naoVerificadoCents: Math.round(get("kyc_limite_nao_verificado_usd", 2000) * 100),
    verificadoCents: Math.round(get("kyc_limite_verificado_usd", 5000) * 100),
  };
}

/** Movimento hoje (USD) por tipo no ledger, em cents. */
async function movidoHojeCents(userId: string, tipo: "deposito" | "levantamento"): Promise<number> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ledger = await db.listLedger(userId, { tipo: tipo === "deposito" ? "deposito" : "levantamento", limit: 100 });
  return ledger
    .filter((e) => new Date(e.criado_em) >= hoje)
    .reduce((acc, e) => acc + Math.abs(Math.round(e.valor * 100)), 0);
}

/**
 * Verifica se o utilizador pode movimentar `valorCents` hoje dado o estado KYC.
 * Não verificado → cap de settings (default $2.000/dia). Verificado → cap de settings (default $5.000/dia).
 */
export async function verificarLimiteKyc(
  userId: string,
  tipo: "deposito" | "levantamento",
  valorCents: number,
): Promise<{ ok: true; estado: KycEstadoCliente } | { ok: false; estado: KycEstadoCliente; erro: string }> {
  const estado = await estadoKyc(userId);
  const { naoVerificadoCents, verificadoCents } = await limites();
  const cap = estado === "verificado" ? verificadoCents : naoVerificadoCents;
  const movido = await movidoHojeCents(userId, tipo);
  if (movido + valorCents > cap) {
    const limiteTxt = `$${(cap / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
    const msg = estado === "verificado"
      ? `Atingiste o limite de ${limiteTxt}.`
      : `O limite atual é ${limiteTxt}. Envia a verificação de identidade para análise.`;
    return { ok: false, estado, erro: msg };
  }
  return { ok: true, estado };
}

/** Última submissão de KYC do utilizador (para mostrar motivo de recusa, etc.). */
export async function ultimaSubmissao(userId: string): Promise<KycSubmission | null> {
  return db.findLatestKycByUser(userId);
}
