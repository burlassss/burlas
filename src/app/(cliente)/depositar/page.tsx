import { dataMode } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { configuracaoEmola } from "@/lib/integrations/emola";
import { DepositoFlow } from "@/components/deposito-flow";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Depositar" };

export default async function DepositarPage() {
  const user = await requireUser();
  const demo = dataMode() === "demo";
  const emola = await configuracaoEmola();
  const emolaDirecto = emola.ativo && !!emola.destino;
  return (
    <div className="mx-auto w-full max-w-2xl pt-1 sm:pt-3">
      <DepositoFlow demo={demo} emolaDirecto={emolaDirecto} telefone={user.telefone} />
    </div>
  );
}
