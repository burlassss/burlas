import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { codigoSeisDigitos, sha256 } from "@/lib/crypto";
import { enviarSms } from "@/lib/integrations/notifica";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  telefone: z.string().trim(),
  proposito: z.enum(["registo", "recuperacao"]).default("registo"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Dados inválidos." }, { status: 422 });
  const { telefone, proposito } = parsed.data;

  // Intervalo mínimo entre reenvios: 30 segundos (anti-abuso)
  const ultimo = await db.latestSmsCode(telefone, proposito);
  if (ultimo && Date.now() - new Date(ultimo.criado_em).getTime() < 30_000) {
    const espera = Math.ceil((30_000 - (Date.now() - new Date(ultimo.criado_em).getTime())) / 1000);
    return NextResponse.json({ erro: `Aguarda ${espera}s antes de pedir um novo código.` }, { status: 429 });
  }
  const rl = rateLimit(`reenvio:${telefone}`, 5, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ erro: "Limite de reenvios atingido. Tenta mais tarde." }, { status: 429 });

  const user = await db.findUserByTelefone(telefone);
  if (!user) return NextResponse.json({ ok: true }); // não divulga existência da conta

  const codigo = codigoSeisDigitos();
  await db.insertSmsCode({
    telefone,
    codigo_hash: sha256(codigo),
    proposito,
    expira_em: new Date(Date.now() + 5 * 60_000).toISOString(),
  });
  const sms = await enviarSms(telefone, `MOZOUT-USD · O teu código de verificação é ${codigo}. Expira em 5 minutos. Nunca partilhes este código.`);

  return NextResponse.json({ ok: true, ...(sms.simulado ? { demoCode: codigo } : {}) });
}
