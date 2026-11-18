import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import { notificar } from "@/lib/services/notify";

const schema = z.object({ estado: z.enum(["ativo", "suspenso", "bloqueado"]) });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "utilizadores.editar")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const { id } = await ctx.params;
  const target = await db.findUserById(id);
  if (!target) return NextResponse.json({ erro: "Utilizador não encontrado." }, { status: 404 });
  if (target.papel === "superadmin" && admin.papel !== "superadmin") {
    return NextResponse.json({ erro: "Apenas um superadministrador pode alterar outro superadministrador." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ erro: "Estado inválido." }, { status: 422 });

  await db.updateUser(target.id, { estado: parsed.data.estado });
  if (parsed.data.estado !== "ativo") await db.deleteUserSessions(target.id); // força novo login
  await db.insertAudit({ ator: admin.id, acao: `utilizador.${parsed.data.estado}`, entidade: "users", entidade_id: target.id, dados: { email: target.email } });
  await notificar(target.id, {
    tipo: "seguranca",
    titulo: parsed.data.estado === "ativo" ? "Conta reativada" : "Conta " + parsed.data.estado,
    corpo: parsed.data.estado === "ativo" ? "A tua conta voltou a estar ativa." : `A tua conta foi ${parsed.data.estado} pela administração. Contacta suporte@mozout.co.mz para mais informação.`,
  });

  return NextResponse.json({ ok: true });
}
