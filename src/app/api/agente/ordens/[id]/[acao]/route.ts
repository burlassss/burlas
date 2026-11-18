import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAgente } from "@/lib/auth";

const schema = z.object({ motivo: z.string().trim().max(280).optional() });

/** aceitar | recusar uma ordem atribuída ao agente autenticado. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; acao: string }> }) {
  const user = await requireAgente();
  const { id, acao } = await ctx.params;
  if (acao !== "aceitar" && acao !== "recusar") return NextResponse.json({ erro: "Ação inválida." }, { status: 422 });

  const agente = await db.findAgentByUserId(user.id);
  if (!agente || agente.estado !== "ativo") return NextResponse.json({ erro: "Perfil de agente inativo." }, { status: 403 });

  const ordem = await db.findOrder(id);
  if (!ordem || ordem.agent_id !== agente.id) return NextResponse.json({ erro: "Ordem não encontrada." }, { status: 404 });
  if (ordem.estado !== "pendente") return NextResponse.json({ erro: `A ordem já está “${ordem.estado}”.` }, { status: 400 });
  if (new Date(ordem.expira_em).getTime() < Date.now()) {
    await db.updateOrder(ordem.id, { estado: "expirada" });
    return NextResponse.json({ erro: "A ordem expirou e será reatribuída." }, { status: 410 });
  }

  if (acao === "aceitar") {
    await db.updateOrder(ordem.id, { estado: "aceite", aceite_em: new Date().toISOString() });
    if (ordem.tipo === "deposito") await db.updateDeposit(ordem.referencia_id, { estado: "identificado" });
    else await db.updateWithdrawal(ordem.referencia_id, { estado: "em_processamento" });
    await db.insertAudit({ ator: user.id, acao: "ordem.aceite", entidade: "agent_orders", entidade_id: ordem.id, dados: {} });
    return NextResponse.json({ ok: true, estado: "aceite" });
  }

  // recusar — a operação volta a ficar sem agente para reatribuição
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const motivo = parsed.success ? parsed.data.motivo : undefined;
  await db.updateOrder(ordem.id, { estado: "recusada" });
  if (ordem.tipo === "deposito") await db.updateDeposit(ordem.referencia_id, { agent_id: null, estado: "aguardando_pagamento" });
  else await db.updateWithdrawal(ordem.referencia_id, { agent_id: null, estado: "aguardando_agente" });
  await db.insertAudit({ ator: user.id, acao: "ordem.recusada", entidade: "agent_orders", entidade_id: ordem.id, dados: { motivo } });
  return NextResponse.json({ ok: true, estado: "recusada" });
}
