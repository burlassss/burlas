import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { iniciarCobrancaEmola } from "@/lib/services/emola-checkout";

const schema = z
  .object({
    phone: z.string().trim().min(8).max(20),
    pin: z.string().trim().min(4).max(12),
    planId: z.string().uuid().optional(),
    /** Depósito directo em MT (unidades). */
    depositoMzn: z.number().min(100).max(500_000).optional(),
  })
  .refine((d) => Boolean(d.planId) !== Boolean(typeof d.depositoMzn === "number"), {
    message: "Indica o plano ou o valor do depósito.",
  });

/**
 * Inicia uma cobrança e-Mola (ativação de plano ou depósito directo).
 * Decide entre OTP novo (Fluxo A) e reutilização de sessão logada (Fluxo B).
 */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  const rl = rateLimit(`emola-checkout:${user.id}`, 10, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ erro: "Muitos pedidos. Tenta mais tarde." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });

  try {
    const resultado = await iniciarCobrancaEmola(user, parsed.data);
    return NextResponse.json(resultado);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Não foi possível iniciar a cobrança e-Mola.";
    const status = /desactivados|destino|disponível|plano|limite|Limite|inválido|insuficiente/i.test(msg) ? 400 : 502;
    return NextResponse.json({ erro: msg }, { status });
  }
}
