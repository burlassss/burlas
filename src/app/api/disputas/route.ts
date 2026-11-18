import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { notificar } from "@/lib/services/notify";

const schema = z.object({
  tipo: z.enum(["levantamento_nao_recebido", "deposito_sem_credito", "agente_sem_resposta", "valor_incorreto", "outro"]),
  detalhes: z.string().trim().min(20, "Descreve o problema com mais detalhe (mín. 20 caracteres).").max(2000),
  depositoId: z.string().uuid().optional(),
  levantamentoId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const rl = rateLimit(`disputa:${user.id}`, 5, 24 * 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ erro: "Limite diário de disputas atingido." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });
  const { tipo, detalhes, depositoId, levantamentoId } = parsed.data;

  let agentId: string | null = null;
  let refId: string | null = null;
  if (depositoId) {
    const d = await db.findDeposit(depositoId);
    if (d && d.user_id === user.id) { agentId = d.agent_id; refId = d.id; }
  } else if (levantamentoId) {
    const w = await db.findWithdrawal(levantamentoId);
    if (w && w.user_id === user.id) { agentId = w.agent_id; refId = w.id; }
  }

  const dispute = await db.insertDispute({
    referencia_id: refId,
    tipo,
    user_id: user.id,
    agent_id: agentId,
    estado: "aberta",
    resolucao: null,
    detalhes,
  });

  await notificar(user.id, { tipo: "disputa_aberta", titulo: "Disputa aberta", corpo: "Recebemos a tua disputa. A equipa MOZOUT vai analisar e responder dentro de 24h úteis." });
  await db.insertAudit({ ator: user.id, acao: "disputa.aberta", entidade: "disputes", entidade_id: dispute.id, dados: { tipo } });

  return NextResponse.json({ ok: true, disputaId: dispute.id });
}
