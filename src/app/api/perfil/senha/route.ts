import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  atual: z.string().min(1, "Introduz a palavra-passe atual."),
  nova: z.string().min(8, "A nova palavra-passe deve ter pelo menos 8 caracteres.").max(72).refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), "Inclui letras e números."),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const rl = rateLimit(`senha:${user.id}`, 5, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ erro: "Muitas tentativas. Tenta mais tarde." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });

  const ok = await verifyPassword(parsed.data.atual, user.password_hash);
  if (!ok) return NextResponse.json({ erro: "A palavra-passe atual está incorreta." }, { status: 400 });

  await db.updateUser(user.id, { password_hash: await hashPassword(parsed.data.nova) });
  await db.insertAudit({ ator: user.id, acao: "senha.alterada", entidade: "users", entidade_id: user.id, dados: {} });
  return NextResponse.json({ ok: true });
}
