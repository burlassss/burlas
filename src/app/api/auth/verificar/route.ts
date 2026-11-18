import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { criarSessao, ipDoPedido } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { notificar } from "@/lib/services/notify";

const schema = z.object({
  telefone: z.string().trim(),
  codigo: z.string().trim().regex(/^\d{6}$/, "O código tem 6 dígitos."),
  proposito: z.enum(["registo", "recuperacao"]).default("registo"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });
  const { telefone, codigo, proposito } = parsed.data;

  const rl = rateLimit(`verificar:${telefone}`, 10, 5 * 60_000);
  if (!rl.ok) return NextResponse.json({ erro: `Demasiadas tentativas. Tenta em ${rl.retryAfterSeg}s.` }, { status: 429 });

  const user = await db.findUserByTelefone(telefone);
  if (!user) return NextResponse.json({ erro: "Não existe conta com este telefone." }, { status: 404 });

  const code = await db.latestSmsCode(telefone, proposito);
  if (!code) return NextResponse.json({ erro: "Nenhum código ativo. Pede um novo código." }, { status: 400 });
  if (new Date(code.expira_em).getTime() < Date.now()) return NextResponse.json({ erro: "O código expirou. Pede um novo código." }, { status: 400 });
  if (code.tentativas >= 5) return NextResponse.json({ erro: "Excedeste o número de tentativas. Pede um novo código." }, { status: 429 });

  if (sha256(codigo) !== code.codigo_hash) {
    await db.updateSmsCode(code.id, { tentativas: code.tentativas + 1 });
    const restantes = Math.max(0, 5 - (code.tentativas + 1));
    return NextResponse.json({ erro: `Código incorreto. ${restantes} tentativa(s) restante(s).` }, { status: 400 });
  }

  await db.updateSmsCode(code.id, { tentativas: code.tentativas + 1, verificado_em: new Date().toISOString() });

  if (proposito === "registo" && user.estado === "pendente") {
    await db.updateUser(user.id, { estado: "ativo", telefone_verificado: true });
    await notificar(user.id, { tipo: "conta_ativada", titulo: "Conta ativada", corpo: "Bem-vinda ao MOZOUT-USD! A tua conta está ativa e o teu saldo está pronto a receber." });
  }

  await criarSessao(user.id, ipDoPedido(req.headers), req.headers.get("user-agent"));
  await db.insertAudit({ ator: user.id, acao: "telefone.verificado", entidade: "users", entidade_id: user.id, dados: { telefone } });

  return NextResponse.json({ ok: true });
}
