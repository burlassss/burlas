import { ScrollText } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, EmptyState } from "@/components/ui";
import { formatDataHora } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Auditoria" };

export default async function AdminAuditoriaPage() {
  await requireAdmin();
  const registos = await db.listAudit(150);
  const utilizadores = await db.listUsers();
  const nomePorId = new Map(utilizadores.map((u) => [u.id, u.nome]));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">Trilha de auditoria</h1>
        <p className="mt-0.5 text-sm font-medium text-ink/55">Cada ação sensível — quem, o quê, quando. Imutável e não editável pela interface.</p>
      </div>

      {registos.length === 0 ? (
        <EmptyState icon={<ScrollText className="h-6 w-6 text-forest" />} title="Sem registos" description="As ações administrativas ficam gravadas aqui automaticamente." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-black/5 bg-surface shadow-sm">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-[0.62rem] font-extrabold uppercase tracking-wider text-ink/45">
                <th className="px-5 py-3.5">Quando</th>
                <th className="px-5 py-3.5">Ator</th>
                <th className="px-5 py-3.5">Ação</th>
                <th className="px-5 py-3.5">Entidade</th>
                <th className="px-5 py-3.5">Detalhe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {registos.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-sand/30">
                  <td className="px-5 py-3.5 text-xs font-semibold text-ink/55">{formatDataHora(a.criado_em)}</td>
                  <td className="px-5 py-3.5 text-xs font-bold text-ink/75">{a.ator ? nomePorId.get(a.ator) ?? "Equipa" : "Sistema"}</td>
                  <td className="px-5 py-3.5"><Badge tone="blue">{a.acao}</Badge></td>
                  <td className="px-5 py-3.5 text-xs font-bold text-ink/70">{a.entidade}{a.entidade_id ? <span className="mt-0.5 block font-mono font-medium text-ink/45">{String(a.entidade_id).slice(0, 12)}…</span> : null}</td>
                  <td className="max-w-[320px] px-5 py-3.5"><code className="block truncate font-mono text-[0.65rem] text-ink/55">{a.dados ? JSON.stringify(a.dados) : "—"}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
