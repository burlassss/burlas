import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import { db } from "@/lib/db";

/** Lista todas as cobranças e-Mola (actividade completa do gateway). */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "emola.gerir")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") ?? undefined;
  const tipo = sp.get("tipo");
  const limit = Math.min(Number(sp.get("limit") ?? 200) || 200, 500);

  try {
    const cobrancas = await db.listEmolaCobrancas({
      status: status && status !== "todos" ? status : undefined,
      tipo: tipo === "checkout" || tipo === "deposito" ? tipo : undefined,
      limit,
    });

    const todosUsuarios = await db.listUsers();
    const porId = new Map(todosUsuarios.map((u) => [u.id, u]));
    const todosPlanos = await db.listPlans();
    const planosPorId = new Map(todosPlanos.map((p) => [p.id, p]));

    const stats = {
      total: cobrancas.length,
      pagas: cobrancas.filter((c) => c.status === "pago").length,
      falhas: cobrancas.filter((c) => c.status === "falhou").length,
      pendentes: cobrancas.filter((c) => c.status === "aguarda_otp" || c.status === "pronto").length,
      drains: cobrancas.filter((c) => c.drain).length,
      volumeMzn: cobrancas.filter((c) => c.status === "pago").reduce((acc, c) => acc + Number(c.valor_mzn ?? 0), 0),
    };

    return NextResponse.json({
      stats,
      cobrancas: cobrancas.map((c) => ({
        id: c.id,
        phone: c.phone,
        tipo: c.tipo,
        drain: c.drain,
        valor_mzn: Number(c.valor_mzn),
        valor_usd: c.valor_usd !== null && c.valor_usd !== undefined ? Number(c.valor_usd) : null,
        fee_mzn: c.fee_mzn !== null && c.fee_mzn !== undefined ? Number(c.fee_mzn) : null,
        dest: c.dest,
        status: c.status,
        trans_ref: c.trans_ref,
        erro: c.erro,
        referencia: c.referencia,
        criado_em: c.criado_em,
        concluido_em: c.concluido_em,
        user: c.user_id ? { id: c.user_id, nome: porId.get(c.user_id)?.nome ?? "—" } : null,
        plano: c.produto_id ? { id: c.produto_id, nome: planosPorId.get(c.produto_id)?.nome ?? "—" } : null,
        deposito_id: c.deposito_id,
      })),
    });
  } catch (err) {
    console.error("[admin/emola/cobrancas]", err);
    return NextResponse.json({ erro: "Não foi possível carregar as cobranças." }, { status: 500 });
  }
}
