import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ExtratoView, type ExtratoItem } from "@/components/extrato-view";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Extrato" };

export default async function ExtratoPage() {
  const user = await requireUser();
  const ledger = await db.listLedger(user.id, { limit: 200 });
  const itens: ExtratoItem[] = ledger.map((e) => ({
    id: e.id,
    tipo: e.tipo,
    descricao: e.descricao,
    valor: e.valor,
    moeda: e.moeda,
    estado: e.estado,
    referencia: e.referencia,
    criado_em: e.criado_em,
  }));

  return <ExtratoView nome={user.nome} itens={itens} />;
}
