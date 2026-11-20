import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { temPermissao } from "@/lib/permissions";
import { urlAssinadaKyc } from "@/lib/storage";
import { KycActions } from "@/components/kyc-actions";
import { Badge } from "@/components/ui";
import { formatDataHora } from "@/lib/money";
import { FileText, IdCard, Car, BookUser } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verificação KYC" };

const DOC: Record<string, { label: string; icon: React.ElementType }> = {
  bi: { label: "Bilhete de Identidade", icon: IdCard },
  passaporte: { label: "Passaporte", icon: BookUser },
  carta_conducao: { label: "Carta de condução", icon: Car },
};

const TABS = [
  { id: "pendente", label: "Pendentes" },
  { id: "aprovada", label: "Aprovadas" },
  { id: "rejeitada", label: "Recusadas" },
] as const;

export default async function AdminKycPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const admin = await requireAdmin();
  if (!temPermissao(admin.papel, "kyc.gerir")) redirect("/admin");

  const { estado } = await searchParams;
  const filtro = TABS.find((t) => t.id === estado) ?? TABS[0];
  const subs = await db.listKycSubmissions({ estado: filtro.id });

  const items = await Promise.all(
    subs.map(async (s) => {
      const u = await db.findUserById(s.user_id);
      const [frente, verso, selfie] = await Promise.all([
        urlAssinadaKyc(s.frente_url),
        urlAssinadaKyc(s.verso_url),
        urlAssinadaKyc(s.selfie_url),
      ]);
      return { s, u, frente, verso, selfie };
    }),
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">Verificação de identidade (KYC)</h1>
        <p className="mt-0.5 text-sm font-medium text-ink/55">Revê os documentos submetidos. Aprovar desbloqueia o limite máximo do cliente.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por estado">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/kyc?estado=${t.id}`}
            role="tab"
            aria-selected={filtro.id === t.id}
            className={filtro.id === t.id
              ? "rounded-full bg-forest px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-lime"
              : "rounded-full border border-mist bg-surface px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-ink/60 hover:border-forest hover:text-forest"}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-mist bg-sand/40 p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-ink/30" />
          <p className="mt-3 text-sm font-bold text-ink/50">Sem submissões {filtro.label.toLowerCase()}.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map(({ s, u, frente, verso, selfie }) => {
            const doc = DOC[s.tipo_documento] ?? DOC.bi;
            const Icone = doc.icon;
            return (
              <li key={s.id} className="grid gap-4 rounded-3xl border border-black/5 bg-surface p-5 lg:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icone className="h-5 w-5 text-forest" strokeWidth={1.8} />
                    <p className="font-extrabold text-ink">{u?.nome ?? "Utilizador"}</p>
                    <Badge tone={s.estado === "aprovada" ? "green" : s.estado === "rejeitada" ? "red" : "amber"}>{s.estado}</Badge>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-ink/55">{doc.label} · nº <span className="font-mono">{s.numero_documento}</span> · {u?.email} · {u?.telefone} · submetido {formatDataHora(s.criado_em)}</p>
                  {s.motivo_recusa && <p className="mt-1 text-xs font-semibold text-red-600">Motivo da recusa: {s.motivo_recusa}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[["Frente", frente], ["Verso", verso], ["Selfie", selfie]].map(([label, src]) =>
                      src ? (
                        <a key={label as string} href={src as string} target="_blank" rel="noreferrer" className="group block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src as string} alt={`${label} do documento`} className="h-36 w-56 rounded-2xl border border-black/10 object-cover transition-transform group-hover:scale-[1.03]" />
                          <span className="mt-1 block text-center text-[0.62rem] font-extrabold uppercase tracking-wider text-ink/45">{label}</span>
                        </a>
                      ) : null,
                    )}
                  </div>
                </div>
                {s.estado === "pendente" && <KycActions id={s.id} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
