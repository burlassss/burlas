import { requireUser } from "@/lib/auth";
import { dataMode } from "@/lib/db";
import { AlterarSenhaForm, SairButton } from "@/components/perfil-forms";
import { PAPEL_LABEL } from "@/lib/labels";
import { Badge } from "@/components/ui";
import { ShieldCheck, Server, Database } from "lucide-react";
import { formatDataCurta } from "@/lib/money";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Perfil" };

export default async function PerfilPage() {
  const user = await requireUser();
  const demo = dataMode() === "demo";

  const linhas: [string, string][] = [
    ["Nome completo", user.nome],
    ["E-mail", user.email],
    ["Telefone", user.telefone],
    ["Data de nascimento", formatDataCurta(user.nascimento)],
    ["Perfil", PAPEL_LABEL[user.papel] ?? user.papel],
    ["Membro desde", formatDataCurta(user.criado_em)],
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pt-1 sm:pt-3">
      <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest sm:text-3xl">O teu perfil</h1>

      <section className="rounded-3xl border border-black/5 bg-surface p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-ink/50">Dados da conta</h2>
          <Badge tone={user.estado === "ativo" ? "green" : "red"}>{user.estado === "ativo" ? "Verificada" : user.estado}</Badge>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {linhas.map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-sand/60 p-3">
              <dt className="text-[0.62rem] font-extrabold uppercase tracking-wider text-ink/50">{k}</dt>
              <dd className="mt-0.5 font-bold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[0.7rem] font-medium text-ink/45">Para alterar o e-mail ou o telefone, contacta suporte@mozout.co.mz com o teu documento.</p>
      </section>

      <section className="rounded-3xl border border-black/5 bg-surface p-6">
        <h2 className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-ink/50">Segurança</h2>
        <div className="mt-4">
          <AlterarSenhaForm />
        </div>
        <div className="mt-5 flex items-start gap-2 rounded-2xl border border-forest/15 bg-lime-soft p-3 text-[0.72rem] font-semibold leading-snug text-forest">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> A MOZOUT nunca te pede a palavra-passe nem códigos por telefone ou SMS. Desconfia de chamadas que se façam passar por nós.
        </div>
      </section>

      <section className="rounded-3xl border border-black/5 bg-surface p-6">
        <h2 className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-ink/50">Ambiente</h2>
        <div className="mt-3 flex items-center gap-3 text-sm font-semibold text-ink/70">
          {demo ? <Server className="h-5 w-5 text-amber-600" /> : <Database className="h-5 w-5 text-forest" />}
          {demo ? "Modo de demonstração — dados em memória, nada é persistido." : "Supabase ligado — dados persistentes em produção."}
        </div>
      </section>

      <SairButton />
    </div>
  );
}
