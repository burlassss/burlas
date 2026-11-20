import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { criarDepositoMobile } from "@/lib/services/operations";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  metodo: z.enum(["mpesa", "emola"]),
  valorMzn: z.number().min(100, "O mínimo são MT 100,00").max(500_000, "Contacta o suporte para valores acima de MT 500 000."),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const rl = rateLimit(`dep-mobile:${user.id}`, 10, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ erro: "Muitos pedidos. Tenta mais tarde." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Valor inválido." }, { status: 422 });

  let resultado: Awaited<ReturnType<typeof criarDepositoMobile>>;
  try {
    resultado = await criarDepositoMobile(user, parsed.data.metodo, Math.round(parsed.data.valorMzn * 100));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Não foi possível criar o depósito.";
    const ehKyc = /Limite diário|limite diário/i.test(msg);
    return NextResponse.json({ erro: msg }, { status: ehKyc ? 403 : 500 });
  }
  const { deposit, agente, cotacao } = resultado;

  const agenteUser = agente ? await db.findUserById(agente.user_id) : null;
  return NextResponse.json({
    deposito: {
      id: deposit.id,
      referencia: deposit.referencia,
      metodo: deposit.metodo,
      valor_mzn: deposit.valor_mzn,
      valor_usd: deposit.valor_usd,
      valor_liquido_usd: deposit.valor_liquido_usd,
      taxa: deposit.taxa,
      estado: deposit.estado,
    },
    cotacao,
    agente: agente
      ? {
          id: agente.id,
          nome: agenteUser?.nome ?? "Agente MOZOUT",
          telefone: agenteUser?.telefone ?? "",
          localizacao: agente.localizacao,
          avaliacao_media: agente.avaliacao_media,
          operacoes_concluidas: agente.operacoes_concluidas,
          tempo_resposta_min: agente.tempo_resposta_min,
          operadora: agente.operadora,
        }
      : null,
  });
}
