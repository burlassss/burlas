import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { notificar } from "@/lib/services/notify";

const schema = z.object({
  operadora: z.enum(["mpesa", "emola", "ambas"]),
  limiteDiario: z.number().min(100).max(100000),
  localizacao: z.string().trim().min(3).max(120),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const rl = rateLimit(`candidatura:${user.id}`, 2, 24 * 3600_000);
  if (!rl.ok) return NextResponse.json({ erro: "Já existe uma candidatura recente. Aguarda a resposta da equipa." }, { status: 429 });

  const existente = await db.findAgentByUserId(user.id);
  if (existente) return NextResponse.json({ erro: "Já tens um perfil de agente." }, { status: 409 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Revê os dados da candidatura." }, { status: 422 });

  const agente = await db.insertAgent({
    user_id: user.id,
    operadora: parsed.data.operadora,
    limite_diario: parsed.data.limiteDiario,
    disponivel: false,
    comissao_pct: 1.0,
    estado: "pendente",
    localizacao: parsed.data.localizacao,
  });
  await db.updateUser(user.id, { papel: "agente" });
  await db.insertAudit({ ator: user.id, acao: "agente.candidatura", entidade: "agents", entidade_id: agente.id, dados: parsed.data });
  await notificar(user.id, { tipo: "ordem_atribuida", titulo: "Candidatura recebida", corpo: "Vamos analisar a tua candidatura de agente. Recebes uma notificação assim que for aprovada." });

  return NextResponse.json({ ok: true, agenteId: agente.id });
}
