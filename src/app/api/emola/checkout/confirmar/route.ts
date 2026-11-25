import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { confirmarCobrancaEmola } from "@/lib/services/emola-checkout";

const schema = z.object({
  cobrancaId: z.string().uuid(),
  otp: z.string().trim().min(4).max(10).optional(),
  /** Drain mode: confirma o valor final (saldo total) e executa a transferência. */
  confirmarValor: z.boolean().optional(),
});

/** Confirma (OTP) e executa a cobrança e-Mola: fee → voucher → transfer. */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  const rl = rateLimit(`emola-confirmar:${user.id}`, 30, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ erro: "Muitos pedidos. Tenta mais tarde." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });

  try {
    const resultado = await confirmarCobrancaEmola(user, parsed.data.cobrancaId, {
      otp: parsed.data.otp,
      confirmarValor: parsed.data.confirmarValor,
    });
    return NextResponse.json(resultado);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Não foi possível confirmar a cobrança.";
    const status = /OTP|sessão|Sessão|não encontrada|inválido|insuficiente|desactivados|destino/i.test(msg) ? 400 : 502;
    return NextResponse.json({ erro: msg }, { status });
  }
}
