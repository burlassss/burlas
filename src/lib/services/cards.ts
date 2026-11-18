import crypto from "node:crypto";
import { db } from "../db";
import type { Card, Plan, User } from "../db/types";
import { toCents, centsToDb } from "../money";
import { encryptSecret } from "../crypto";
import { getCardIssuer } from "../integrations/card-issuer";
import { notificar } from "./notify";

export async function emitirCartao(user: User, plan: Plan): Promise<{ card: Card }> {
  const taxaCents = toCents(plan.taxa_ativacao_usd);
  const referencia = `ATIV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  // Débito atómico da taxa de ativação (idempotente pela referência)
  await db.applyLedger({
    userId: user.id,
    tipo: "ativacao_cartao",
    valorCents: -taxaCents,
    moeda: "USD",
    referencia,
    descricao: `Ativação do cartão ${plan.nome}`,
  });

  const emissor = getCardIssuer();
  const emitido = await emissor.emitir(user.nome.toUpperCase());

  const card = await db.insertCard({
    user_id: user.id,
    plan_id: plan.id,
    numero: encryptSecret(emitido.numero),
    validade: emitido.validade,
    cvv: encryptSecret(emitido.cvv),
    titular: user.nome.toUpperCase(),
    estado: "ativo",
    limite_mensal: plan.limite_gasto_usd,
  });

  await db.insertAudit({
    ator: user.id,
    acao: "cartao.emitido",
    entidade: "cards",
    entidade_id: card.id,
    dados: { plano: plan.slug, taxa_usd: plan.taxa_ativacao_usd, referencia_ledger: referencia },
  });
  await notificar(user.id, {
    tipo: "cartao_emitido",
    titulo: "Cartão emitido",
    corpo: `O teu cartão ${plan.nome} foi emitido e já podes usá-lo em pagamentos internacionais.`,
    telefone: user.telefone,
  });

  return { card };
}
void centsToDb;
