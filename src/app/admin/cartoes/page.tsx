import { CreditCard } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, EmptyState } from "@/components/ui";
import { CardAcoes } from "@/components/admin-actions";
import { ESTADO_CARTAO } from "@/lib/labels";
import { formatDataCurta } from "@/lib/money";
import { luhnValido } from "@/lib/luhn";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cartões" };

export default async function AdminCartoesPage() {
  await requireAdmin();
  const cartoes = await db.listAllCards();
  const utilizadores = await db.listUsers();
  const planos = await db.listPlans();
  const nomePorId = new Map(utilizadores.map((u) => [u.id, u.nome]));
  const planoPorId = new Map(planos.map((p) => [p.id, p]));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">Cartões emitidos</h1>
        <p className="mt-0.5 text-sm font-medium text-ink/55">{cartoes.length} cartão{cartoes.length === 1 ? "" : "s"} na plataforma · números validados Luhn na emissão</p>
      </div>

      {cartoes.length === 0 ? (
        <EmptyState icon={<CreditCard className="h-6 w-6 text-forest" />} title="Sem cartões emitidos" description="Assim que um cliente pagar a taxa de ativação, o cartão aparece aqui." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-black/5 bg-surface shadow-sm">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-[0.62rem] font-extrabold uppercase tracking-wider text-ink/45">
                <th className="px-5 py-3.5">Titular</th>
                <th className="px-5 py-3.5">Plano</th>
                <th className="px-5 py-3.5">Número</th>
                <th className="px-5 py-3.5">Validade</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Emitido</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {cartoes.map((c) => {
                const estado = ESTADO_CARTAO[c.estado];
                const plano = planoPorId.get(c.plan_id);
                return (
                  <tr key={c.id} className="transition-colors hover:bg-sand/30">
                    <td className="px-5 py-3.5">
                      <p className="font-extrabold text-ink">{c.titular}</p>
                      <p className="text-[0.7rem] font-semibold text-ink/50">{nomePorId.get(c.user_id) ?? "—"}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold text-ink/75">{plano?.nome ?? "—"}</td>
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-ink/75">•••• {String(c.numero).slice(-4)}</td>
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-ink/75">{c.validade}</td>
                    <td className="px-5 py-3.5"><Badge tone={estado?.tone ?? "zinc"}>{estado?.label ?? c.estado}</Badge></td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-ink/55">{formatDataCurta(c.criado_em)}</td>
                    <td className="px-5 py-3.5"><CardAcoes id={c.id} estado={c.estado} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[0.68rem] font-semibold text-ink/45">Os números completos estão cifrados (AES-256-GCM) e só são revelados ao titular, com registo na auditoria. Validador Luhn: {luhnValido("4539578763621486") ? "operacional" : "indisponível"}.</p>
    </div>
  );
}
