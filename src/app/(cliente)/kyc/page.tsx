import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { estadoKyc, ultimaSubmissao } from "@/lib/kyc";
import { KycForm, KycSucesso } from "@/components/kyc-form";
import { ShieldCheck, BadgeCheck, Clock, XCircle, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verificação de identidade" };

export default async function KycPage() {
  const user = await requireUser();
  const [estado, ultima] = await Promise.all([estadoKyc(user.id), ultimaSubmissao(user.id)]);

  let corpo: React.ReactNode;
  if (estado === "verificado") {
    corpo = (
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lime-soft">
          <BadgeCheck className="h-8 w-8 text-forest" strokeWidth={1.8} />
        </span>
        <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.03em] text-forest">Identidade verificada</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-ink/60">A tua identidade está verificada. Estás com o limite máximo diário ativo.</p>
        <Link href="/painel" className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-base font-extrabold text-lime hover:bg-moss">Ir para o painel <ArrowRight className="h-5 w-5" /></Link>
      </div>
    );
  } else if (estado === "pendente") {
    corpo = (
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Clock className="h-8 w-8 text-amber-700" strokeWidth={1.8} />
        </span>
        <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.03em] text-forest">Em análise</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-ink/60">Os teus documentos estão em análise. Avisamos-te assim que a decisão sair.</p>
        <Link href="/painel" className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-base font-extrabold text-lime hover:bg-moss">Ir para o painel <ArrowRight className="h-5 w-5" /></Link>
      </div>
    );
  } else if (estado === "rejeitada") {
    corpo = (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 text-sm font-extrabold text-red-700"><XCircle className="h-5 w-5" /> Verificação recusada</p>
          {ultima?.motivo_recusa && <p className="mt-1.5 text-sm font-medium text-red-700/90">Motivo: {ultima.motivo_recusa}</p>}
          <p className="mt-1.5 text-xs font-semibold text-red-700/80">Corrige os documentos e submete novamente.</p>
        </div>
        <KycForm />
      </div>
    );
  } else {
    corpo = (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-forest/15 bg-lime-soft p-4 text-sm font-semibold text-forest/90">
          Sem verificação, o limite diário é de <strong>$2.000 USD</strong>. Verifica a tua identidade para subir para <strong>$5.000 USD</strong>.
        </div>
        <KycForm />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-1 pt-2 sm:pt-6">
      <section className="rounded-3xl border border-black/5 bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest text-lime"><ShieldCheck className="h-6 w-6" strokeWidth={1.8} /></span>
          <div>
            <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-forest/70">MOZOUT · KYC</p>
            <h1 className="text-xl font-extrabold tracking-[-0.03em] text-forest">Verificação de identidade</h1>
          </div>
        </div>
        <div className="mt-5">{corpo}</div>
      </section>
    </div>
  );
}
