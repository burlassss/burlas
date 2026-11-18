import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LevantamentoFlow, type LevantamentoResumo } from "@/components/levantamento-flow";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Levantar" };

export default async function LevantarPage() {
  const user = await requireUser();
  const levantamentos = await db.listWithdrawals({ userId: user.id, limit: 5 });
  const recentes: LevantamentoResumo[] = levantamentos.map((w) => ({
    id: w.id,
    referencia: w.referencia,
    metodo: w.metodo,
    valor_usd: w.valor_usd,
    valor_liquido_mzn: w.valor_liquido_mzn,
    estado: w.estado,
    destino: w.destino,
    criado_em: w.criado_em,
    codigo_tx: w.codigo_tx,
  }));

  return (
    <div className="mx-auto w-full max-w-2xl pt-1 sm:pt-3">
      <LevantamentoFlow telefoneInicial={user.telefone} recentes={recentes} />
    </div>
  );
}
