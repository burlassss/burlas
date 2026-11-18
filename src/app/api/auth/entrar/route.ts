import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, criarSessao, destinoPorPapel, ipDoPedido } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  identificador: z.string().trim().min(3, "Introduz o e-mail ou telefone."),
  password: z.string().min(1, "Introduz a palavra-passe."),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });
  const { identificador, password } = parsed.data;

  const rl = rateLimit(`login:${identificador.toLowerCase()}`, 10, 5 * 60_000);
  if (!rl.ok) return NextResponse.json({ erro: `Demasiadas tentativas. Tenta em ${rl.retryAfterSeg}s.` }, { status: 429 });

  // Aceita e-mail ou telefone internacional
  const ident = identificador.replace(/\s/g, "");
  const user = ident.includes("@") ? await db.findUserByEmail(ident) : await db.findUserByTelefone(ident);
  if (!user) return NextResponse.json({ erro: "Credenciais inválidas." }, { status: 401 });

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    await db.insertAudit({ ator: user.id, acao: "login.falhado", entidade: "users", entidade_id: user.id, dados: {} });
    return NextResponse.json({ erro: "Credenciais inválidas." }, { status: 401 });
  }

  if (user.estado === "pendente") {
    return NextResponse.json({ erro: "A tua conta ainda não foi verificada. Cria a conta novamente para receberes o código SMS.", codigo: "PENDENTE" }, { status: 403 });
  }
  if (user.estado === "suspenso") return NextResponse.json({ erro: "A tua conta está suspensa. Contacta suporte@mozout.co.mz." }, { status: 403 });
  if (user.estado === "bloqueado") return NextResponse.json({ erro: "A tua conta está bloqueada. Contacta suporte@mozout.co.mz." }, { status: 403 });

  await criarSessao(user.id, ipDoPedido(req.headers), req.headers.get("user-agent"));
  await db.insertAudit({ ator: user.id, acao: "login.sucesso", entidade: "users", entidade_id: user.id, dados: { ip: ipDoPedido(req.headers) } });

  return NextResponse.json({ ok: true, destino: destinoPorPapel(user.papel) });
}
