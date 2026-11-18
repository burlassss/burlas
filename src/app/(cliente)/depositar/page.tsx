import { dataMode } from "@/lib/db";
import { DepositoFlow } from "@/components/deposito-flow";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Depositar" };

export default function DepositarPage() {
  const demo = dataMode() === "demo";
  return (
    <div className="mx-auto w-full max-w-2xl pt-1 sm:pt-3">
      <DepositoFlow demo={demo} />
    </div>
  );
}
