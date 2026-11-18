import { Scale } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, EmptyState } from "@/components/ui";
import { DisputaAcoes } from "@/components/depositos-admin";
import { ESTADO_DISPUTA } from "@/lib/labels";
import { formatDataHora } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Disputas" };

const TIPO_LABEL: Record<string, string> = {
  levantamento_nao_recebido: "Levantamento não recebido",
  deposito_sem_credito: "Depósito sem crédito",
  agente_sem_resposta: "Agente sem resposta",
  valor_incorreto: "Valor incorreto",
  outro: "Outro",
};

export default async function AdminDisputasPage() {
  await requireAdmin();
  const disputas = await db.listDisputes();
  const utilizadores = await db.listUsers();
  const nomePorId = new Map(utilizadores.map((u) => [u.id, u.nome]));
  const abertas = disputas.filter((d) => d.estado === "aberta" || d.estado === "em_analise");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">Disputas & reclamações</h1>
          <p className="mt-0.5 text-sm font-medium text-ink/55">{abertas.length} em aberto · mediação entre cliente e agente</p>
        </div>
      </div>

      {disputas.length === 0 ? (
        <EmptyState icon={<Scale className="h-6 w-6 text-forest" />} title="Sem disputas" description="Ninguém abriu uma disputa. Quando acontecer, aparece aqui para mediação." />
      ) : (
        <div className="flex flex-col gap-3">
          {disputas.map((d) => {
            const estadoMeta = ESTADO_DISPUTA[d.estado];
            return (
              <article key={d.id} className="grid gap-4 rounded-3xl border border-black/5 bg-surface p-5 shadow-sm lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={estadoMeta?.tone ?? "zinc"}>{estadoMeta?.label ?? d.estado}</Badge>
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-ink/45">{TIPO_LABEL[d.tipo] ?? d.tipo} · {formatDataHora(d.criado_em)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm font-medium leading-relaxed text-ink/75">{d.detalhes ?? "Sem detalhes fornecidos."}</p>
                  <p className="mt-2 text-[0.72rem] font-semibold text-ink/50">
                    Aberta por <span className="font-bold text-ink/75">{nomePorId.get(d.user_id) ?? "—"}</span>
                    {d.referencia_id && <> · ref. <span className="font-mono">{String(d.referencia_id).slice(0, 8)}…</span></>}
                  </p>
                  {d.resolucao && <p className="mt-2 rounded-2xl bg-lime-soft p-3 text-xs font-semibold text-forest">Resolução: {d.resolucao}</p>}
                </div>
                <div className="flex items-center lg:justify-end">
                  <DisputaAcoes id={d.id} estado={d.estado} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
