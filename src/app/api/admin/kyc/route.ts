import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { temPermissao } from "@/lib/permissions";
import type { KycEstado } from "@/lib/db/types";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "kyc.gerir")) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const estado = req.nextUrl.searchParams.get("estado");
  const filtro = estado === "pendente" || estado === "aprovada" || estado === "rejeitada" ? { estado: estado as KycEstado } : undefined;
  const subs = await db.listKycSubmissions(filtro);
  const comUtilizador = await Promise.all(
    subs.map(async (s) => {
      const u = await db.findUserById(s.user_id);
      return { ...s, utilizador: u ? { id: u.id, nome: u.nome, email: u.email, telefone: u.telefone } : null };
    }),
  );
  return NextResponse.json({ submissoes: comUtilizador });
}
