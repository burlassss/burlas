import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAgente } from "@/lib/auth";
import { db } from "@/lib/db";
import { telefoneValido } from "@/lib/utils";

const schema = z.object({
  operadora: z.enum(["mpesa", "emola", "ambas"]),
  telefone_mpesa: z.string().trim().max(24).optional().default(""),
  telefone_emola: z.string().trim().max(24).optional().default(""),
});

export async function PUT(req: Request) {
  const user = await requireAgente();
  const agente = await db.findAgentByUserId(user.id);
  if (!agente) return NextResponse.json({ erro: "Perfil de agente não encontrado." }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erro: "Revê os métodos e números indicados." }, { status: 422 });

  const mpesa = parsed.data.operadora === "mpesa" || parsed.data.operadora === "ambas" ? parsed.data.telefone_mpesa.replace(/\s/g, "") : null;
  const emola = parsed.data.operadora === "emola" || parsed.data.operadora === "ambas" ? parsed.data.telefone_emola.replace(/\s/g, "") : null;
  if (mpesa && !telefoneValido(mpesa)) return NextResponse.json({ erro: "Indica um número M-Pesa válido no formato internacional (+258…)." }, { status: 422 });
  if (emola && !telefoneValido(emola)) return NextResponse.json({ erro: "Indica um número e-Mola válido no formato internacional (+258…)." }, { status: 422 });

  await db.updateAgent(agente.id, { operadora: parsed.data.operadora, telefone_mpesa: mpesa, telefone_emola: emola });
  await db.insertAudit({ ator: user.id, acao: "agente.metodos_atualizados", entidade: "agents", entidade_id: agente.id, dados: { operadora: parsed.data.operadora, mpesaConfigurado: Boolean(mpesa), emolaConfigurado: Boolean(emola) } });
  return NextResponse.json({ ok: true });
}
