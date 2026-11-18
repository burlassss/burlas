import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { codigoSeisDigitos, sha256 } from "@/lib/crypto";
import { enviarSms } from "@/lib/integrations/notifica";
import { rateLimit } from "@/lib/rate-limit";
import { telefoneValido } from "@/lib/utils";

const schema = z.object({
  nome: z.string().trim().min(3, "Introduz o teu nome completo.").max(120),
  nascimento: z.string().refine((d) => {
    const nasc = new Date(d);
    if (Number.isNaN(nasc.getTime())) return false;
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade >= 18;
  }, "Tens de ter pelo menos 18 anos."),
  telefone: z.string().trim().refine(telefoneValido, "Telefone inválido. Usa o formato internacional (+258 …)."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(8, "A palavra-passe deve ter pelo menos 8 caracteres.").max(72).refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), "Inclui letras e números."),
  termos: z.literal(true, { message: "Aceita os termos para continuar." }),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });
  }
  const { nome, nascimento, telefone, email, password } = parsed.data;

  // Anti-abuso: máx. 3 registos/códigos por telefone em 10 minutos
  const rl = rateLimit(`registo:${telefone}`, 3, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json({ erro: `Demasiados pedidos. Tenta novamente em ${rl.retryAfterSeg}s.` }, { status: 429 });
  }

  const [emailExiste, telefoneExiste] = await Promise.all([db.findUserByEmail(email), db.findUserByTelefone(telefone)]);
  if (emailExiste) return NextResponse.json({ erro: "Este e-mail já está registado." }, { status: 409 });
  if (telefoneExiste) return NextResponse.json({ erro: "Este telefone já está registado." }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const user = await db.insertUser({
    nome,
    email,
    telefone,
    nascimento,
    password_hash: passwordHash,
    estado: "pendente",
    telefone_verificado: false,
    papel: "cliente",
  });

  const codigo = codigoSeisDigitos();
  await db.insertSmsCode({
    telefone,
    codigo_hash: sha256(codigo),
    proposito: "registo",
    expira_em: new Date(Date.now() + 5 * 60_000).toISOString(),
  });

  const sms = await enviarSms(telefone, `MOZOUT-USD · O teu código de verificação é ${codigo}. Expira em 5 minutos. Nunca partilhes este código.`);

  await db.insertAudit({ ator: user.id, acao: "utilizador.registado", entidade: "users", entidade_id: user.id, dados: { email, telefone, sms: sms.ok ? (sms.simulado ? "simulado" : "enviado") : "falhou" } });

  return NextResponse.json({
    ok: true,
    telefone,
    ...(sms.simulado ? { demoCode: codigo } : {}),
  });
}
