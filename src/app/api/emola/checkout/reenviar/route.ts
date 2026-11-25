import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { reenviarOtpEmola } from "@/lib/services/emola-checkout";

const schema = z.object({ cobrancaId: z.string().uuid() });

/** Reenvia o OTP (novo SMS) para uma cobrança que ainda aguarda código. */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  const rl = rateLimit(`emola-reenviar:${user.id}`, 6, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ erro: "Demasiados reenvios. Tenta mais tarde." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Dados inválidos." }, { status: 422 });

  try {
    const resultado = await reenviarOtpEmola(user, parsed.data.cobrancaId);
    return NextResponse.json(resultado);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Não foi possível reenviar o código.";
    console.error(`[emola/reenviar] ${msg}`);
    return NextResponse.json({ erro: msg }, { status: /não aguarda|não encontrada/i.test(msg) ? 400 : 502 });
  }
}
