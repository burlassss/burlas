import { History } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDataHora } from "@/lib/money";
import { FeeForm, TaxaCambioForm } from "@/components/taxas-admin";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Taxas & Câmbio" };

export default async function AdminTaxasPage() {
  await requireAdmin();
  const [taxas, fees] = await Promise.all([db.listRates(), db.listFees()]);
  const recentes = taxas.slice(0, 8);
  const taxaAtual = recentes[0];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">Taxas & Câmbio</h1>
        <p className="mt-0.5 text-sm font-medium text-ink/55">Controla a cotação USD/MZN e todas as taxas da plataforma. Tudo auditado.</p>
      </div>

      {/* Câmbio */}
      <section className="rounded-3xl border border-black/5 bg-surface p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-extrabold uppercase tracking-[0.16em] text-ink/55"><History className="h-4 w-4" /> Cotação USD/MZN</h2>
        <div className="mt-4">
          <TaxaCambioForm valorAtual={taxaAtual?.valor ?? 63.8} margemAtual={taxaAtual?.margem ?? 1.5} efetivoEm={taxaAtual?.criado_em ?? new Date().toISOString()} />
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="border-b border-black/5 text-[0.6rem] font-extrabold uppercase tracking-wider text-ink/45"><th className="py-2 pr-4">Registada</th><th className="py-2 pr-4">Par</th><th className="py-2 pr-4">Valor</th><th className="py-2">Margem</th></tr>
            </thead>
            <tbody className="divide-y divide-black/5 font-semibold text-ink/75">
              {recentes.map((t, i) => (
                <tr key={t.id}>
                  <td className="py-2 pr-4">{formatDataHora(t.criado_em)} {i === 0 && <Badge tone="green" className="ml-1">Atual</Badge>}</td>
                  <td className="py-2 pr-4">{t.par}</td>
                  <td className="py-2 pr-4 tabular-nums">{Number(t.valor).toLocaleString("pt-MZ", { minimumFractionDigits: 2 })}</td>
                  <td className="py-2 tabular-nums">{t.margem}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Fees */}
      <section className="overflow-hidden rounded-3xl border border-black/5 bg-surface shadow-sm">
        <header className="border-b border-black/5 px-5 py-4">
          <h2 className="font-extrabold uppercase tracking-[0.16em] text-ink/55">Taxas operacionais</h2>
          <p className="mt-0.5 text-xs font-medium text-ink/50">Edita valores e ativa/desativa cada taxa — aplicadas nas próximas operações.</p>
        </header>
        <div className="hidden grid-cols-12 gap-2 border-b border-black/5 px-5 py-2 text-[0.6rem] font-extrabold uppercase tracking-wider text-ink/40 sm:grid">
          <span className="col-span-5">Operação</span><span className="col-span-3">Valor</span><span className="col-span-2">Estado</span><span className="col-span-2" />
        </div>
        <div className="divide-y divide-black/5">
          {fees.map((fee) => (
            <FeeForm key={fee.chave} fee={fee} />
          ))}
          {fees.length === 0 && <p className="px-5 py-6 text-center text-sm font-semibold text-ink/45">Sem taxas configuradas — aplica as migrações/seeds.</p>}
        </div>
      </section>
    </div>
  );
}
