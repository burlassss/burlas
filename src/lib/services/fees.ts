import { db } from "../db";

export async function getFee(chave: string, fallback = 0): Promise<number> {
  const fees = await db.listFees();
  const f = fees.find((x) => x.chave === chave);
  if (!f || !f.ativo) return fallback;
  return f.valor;
}
