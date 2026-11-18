import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { CartoesView, type CartaoExistente, type PlanoResumo } from "@/components/cartoes-view";
import type { PlanTipo } from "@/lib/db/types";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cartões" };

export default async function CartoesPage() {
  const user = await requireUser();
  const [planos, cartoes, saldoCents] = await Promise.all([
    db.listPlans(),
    db.listCardsByUser(user.id),
    db.balanceCents(user.id),
  ]);

  const planosAtivos: PlanoResumo[] = planos
    .filter((p) => p.ativo)
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      tipo: p.tipo as PlanTipo,
      descricao: p.descricao,
      taxa_ativacao_usd: p.taxa_ativacao_usd,
      mensalidade_usd: p.mensalidade_usd,
      limite_gasto_usd: p.limite_gasto_usd,
      limite_carga_usd: p.limite_carga_usd,
      validade_meses: p.validade_meses,
      beneficios: Array.isArray(p.beneficios) ? p.beneficios.map(String) : [],
      destaque: p.destaque,
    }));

  const cartoesExistentes: CartaoExistente[] = await Promise.all(
    cartoes.map(async (c) => {
      const plan = await db.findPlan(c.plan_id);
      return {
        id: c.id,
        plan_id: c.plan_id,
        planNome: plan?.nome ?? "Cartão",
        tipo: plan?.tipo ?? "compras",
        estado: c.estado,
        validade: c.validade,
        limite_mensal: c.limite_mensal,
        ultimos4: decryptSecret(c.numero).slice(-4),
        titular: c.titular,
      };
    }),
  );

  return <CartoesView planos={planosAtivos} cartoes={cartoesExistentes} saldoCents={saldoCents} />;
}
