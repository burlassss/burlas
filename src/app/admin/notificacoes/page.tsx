import { BellRing, ScrollText, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, EmptyState } from "@/components/ui";
import { ReenviarButton } from "@/components/notificacoes-admin";
import { formatDataHora } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notificações" };

export default async function AdminNotificacoesPage() {
  await requireAdmin();
  const notificacoes = (await db.listAllNotifications()).slice(0, 60);
  const utilizadores = await db.listUsers();
  const nomePorId = new Map(utilizadores.map((u) => [u.id, u.nome]));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">Notificações enviadas</h1>
        <p className="mt-0.5 text-sm font-medium text-ink/55">Registo de tudo o que o sistema enviou — com opção de reenvio de SMS falhados.</p>
      </div>

      {notificacoes.length === 0 ? (
        <EmptyState icon={<BellRing className="h-6 w-6 text-forest" />} title="Sem notificações" description="Os disparos de OTP, alertas e avisos aparecem aqui." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-black/5 bg-surface shadow-sm">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-[0.62rem] font-extrabold uppercase tracking-wider text-ink/45">
                <th className="px-5 py-3.5">Data</th>
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Tipo</th>
                <th className="px-5 py-3.5">Canal</th>
                <th className="px-5 py-3.5">Conteúdo</th>
                <th className="px-5 py-3.5 text-right">SMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {notificacoes.map((n) => (
                <tr key={n.id} className="transition-colors hover:bg-sand/30">
                  <td className="px-5 py-3.5 text-xs font-semibold text-ink/55">{formatDataHora(n.criado_em)}</td>
                  <td className="px-5 py-3.5 font-bold text-ink">{nomePorId.get(n.user_id) ?? "—"}</td>
                  <td className="px-5 py-3.5"><Badge tone="zinc">{n.tipo}</Badge></td>
                  <td className="px-5 py-3.5 text-xs font-extrabold uppercase text-ink/60">{n.canal}</td>
                  <td className="max-w-[280px] px-5 py-3.5"><p className="truncate text-xs font-medium text-ink/65">{n.titulo}{n.corpo ? ` — ${n.corpo}` : ""}</p></td>
                  <td className="px-5 py-3.5 text-right">{n.canal === "sms" ? <ReenviarButton id={n.id} /> : <span className="text-[0.68rem] font-bold text-ink/35">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
