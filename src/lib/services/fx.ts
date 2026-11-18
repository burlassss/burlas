import { db } from "../db";

export interface Cotacao {
  par: string;
  /** Taxa base, ex.: 1 USD = 63.8 MZN */
  valor: number;
  /** Margem comercial da plataforma em % */
  margemPct: number;
  /** Taxa efetiva aplicada ao cliente (já com margem) */
  valorEfetivo: number;
  rateId: string | null;
}

/** Devolve a cotação USD/MZN atual (com margem). Fallback para DEFAULT_FX_RATE. */
export async function cotacao(par = "USD/MZN"): Promise<Cotacao> {
  const rate = await db.latestRate(par);
  const valor = rate?.valor ?? Number(process.env.DEFAULT_FX_RATE ?? 63.8);
  const margemPct = rate?.margem ?? 1.5;
  return {
    par,
    valor,
    margemPct,
    valorEfetivo: valor * (1 - margemPct / 100),
    rateId: rate?.id ?? null,
  };
}

export function usdParaMzn(usdCents: number, taxa: number): number {
  return Math.round(usdCents * taxa);
}
export function mznParaUsd(mznCents: number, taxa: number): number {
  return Math.round(mznCents / taxa);
}
