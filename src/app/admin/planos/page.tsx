import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PlanosAdmin } from "@/components/planos-admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Planos" };

export default async function AdminPlanosPage() {
  await requireAdmin();
  const planos = await db.listPlans();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">Planos de cartão</h1>
        <p className="mt-0.5 text-sm font-medium text-ink/55">Preços, limites, benefícios e visibilidade — nada disto está fixo no código.</p>
      </div>
      <PlanosAdmin planos={planos} />
    </div>
  );
}
