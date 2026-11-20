import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { criarLevantamento } from "@/lib/services/operations";
import { telefoneValido } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  metodo: z.enum(["mpesa", "emola"]),
  valorUsd: z.number().min(5, "O mínimo são $5.00").max(3000, "O máximo por levantamento são $3,000.00"),
  destino: z.string().trim().refine(telefoneValido, "Número de destino inválido. Usa o formato +258…"),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const rl = rateLimit(`lev:${user.id}`, 10, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ erro: "Muitos pedidos. Tenta mais tarde." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });

  const resultado = await criarLevantamento(user, parsed.data.metodo, Math.round(parsed.data.valorUsd * 100), parsed.data.destino.replace(/\s/g, ""));
  if (!resultado.ok) {
    const ehKyc = /Limite diário|limite diário/i.test(resultado.erro);
    return NextResponse.json({ erro: resultado.erro }, { status: ehKyc ? 403 : 400 });
  }

  const { withdrawal, agente, cotacao } = resultado;
  return NextResponse.json({
    levantamento: {
      id: withdrawal.id,
      referencia: withdrawal.referencia,
      valor_usd: withdrawal.valor_usd,
      valor_liquido_mzn: withdrawal.valor_liquido_mzn,
      taxa: withdrawal.taxa,
      estado: withdrawal.estado,
      destino: withdrawal.destino,
    },
    cotacao,
    agente: agente
      ? { nome: `Agente verificado${agente.localizacao ? ` · ${agente.localizacao}` : ""}` }
      : null,
  });
}
