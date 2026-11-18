import Link from "next/link";
import { Search, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, EmptyState } from "@/components/ui";
import { UsuarioAcoes } from "@/components/admin-actions";
import { PAPEL_LABEL, ESTADO_USUARIO } from "@/lib/labels";
import { formatDataCurta } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Utilizadores" };

export default async function AdminUtilizadoresPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const utilizadores = await db.listUsers(q?.trim() || undefined);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">Utilizadores</h1>
          <p className="mt-0.5 text-sm font-medium text-ink/55">{utilizadores.length} conta{utilizadores.length === 1 ? "" : "s"}{q ? ` para “${q}”` : ""}</p>
        </div>
        <form className="flex w-full max-w-sm items-center gap-2 rounded-2xl border border-mist bg-surface px-4 focus-within:border-forest" action="/admin/utilizadores" role="search">
          <Search className="h-5 w-5 shrink-0 text-ink/40" />
          <input name="q" defaultValue={q} placeholder="Pesquisar por nome, telefone ou e-mail…" className="h-12 w-full bg-transparent text-sm font-semibold outline-none placeholder:text-ink/35" aria-label="Pesquisar utilizadores" />
        </form>
      </div>

      {utilizadores.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6 text-forest" />} title="Sem resultados" description="Nenhum utilizador corresponde à pesquisa." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-black/5 bg-surface shadow-sm">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-[0.62rem] font-extrabold uppercase tracking-wider text-ink/45">
                <th className="px-5 py-3.5">Utilizador</th>
                <th className="px-5 py-3.5">Telefone</th>
                <th className="px-5 py-3.5">Perfil</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Membro</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {utilizadores.map((u) => {
                const estado = ESTADO_USUARIO[u.estado];
                return (
                  <tr key={u.id} className="transition-colors hover:bg-sand/30">
                    <td className="px-5 py-3.5">
                      <p className="font-extrabold text-ink">{u.nome}</p>
                      <p className="text-[0.7rem] font-semibold text-ink/50">{u.email}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-ink/75">{u.telefone}</td>
                    <td className="px-5 py-3.5"><Badge tone={u.papel === "superadmin" || u.papel === "admin" ? "blue" : "zinc"}>{PAPEL_LABEL[u.papel] ?? u.papel}</Badge></td>
                    <td className="px-5 py-3.5"><Badge tone={estado?.tone ?? "zinc"}>{estado?.label ?? u.estado}</Badge></td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-ink/55">{formatDataCurta(u.criado_em)}</td>
                    <td className="px-5 py-3.5"><UsuarioAcoes id={u.id} nome={u.nome} estado={u.estado} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[0.68rem] font-semibold text-ink/45">Dica: ajustes manuais de saldo ficam registados na auditoria com o teu nome e o motivo indicado.</p>
    </div>
  );
}
