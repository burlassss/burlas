"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button, FieldError } from "@/components/ui";
import { cn } from "@/lib/utils";
import { KycForm, KycSucesso } from "@/components/kyc-form";
import type { KycEstadoCliente } from "@/lib/db/types";

const USOS = [
  { id: "mercado_financeiro", label: "Mercado financeiro" },
  { id: "compras_online", label: "Compras online" },
  { id: "criptomoeda", label: "Criptomoeda" },
  { id: "assinaturas", label: "Assinaturas" },
  { id: "outros", label: "Outros" },
] as const;

const METODOS = [
  { id: "mpesa_emola", label: "M-Pesa / e-Mola" },
  { id: "transferencia_bancaria", label: "Transferência bancária" },
  { id: "cartao_estrangeiro", label: "Cartão bancário estrangeiro" },
  { id: "criptomoeda", label: "Criptomoeda" },
  { id: "dinheiro_informal", label: "Dinheiro (agentes / cambistas)" },
  { id: "nenhum", label: "Nenhum" },
] as const;

type Passo = "usos" | "metodos" | "limite" | "kyc" | "concluido";

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "flex min-h-12 items-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-sm font-bold transition-all",
        ativo ? "border-forest bg-forest text-lime shadow-sm" : "border-mist bg-surface text-ink/70 hover:border-forest/40 hover:text-ink",
      )}
    >
      {ativo && <Check className="h-4 w-4" strokeWidth={3} />}
      {children}
    </button>
  );
}

export function OnboardingWizard({ nome, kycInicial }: { nome: string; kycInicial: KycEstadoCliente }) {
  const router = useRouter();
  const [passo, setPasso] = React.useState<Passo>(kycInicial === "verificado" ? "concluido" : "usos");
  const [usos, setUsos] = React.useState<string[]>([]);
  const [metodos, setMetodos] = React.useState<string[]>([]);
  const [erro, setErro] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const toggle = (lista: string[], set: (v: string[]) => void, id: string) => {
    set(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);
  };

  async function avancarParaLimite() {
    setErro(null);
    setLoading(true);
    try {
      const resp = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usos, metodos_antes: metodos }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        setErro(data?.erro ?? "Não foi possível guardar. Tenta novamente.");
        return;
      }
      setPasso("limite");
    } finally {
      setLoading(false);
    }
  }

  if (passo === "usos") {
    return (
      <section className="rounded-3xl border border-black/5 bg-surface p-6 shadow-sm sm:p-8">
        <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-forest/70">Passo 1 de 4 · Conhecer-te</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-forest">Olá{nome ? `, ${nome}` : ""}! Como pretendes usar os teus cartões?</h1>
        <p className="mt-1.5 text-sm font-medium text-ink/60">Escolhe tudo o que se aplica — ajuda-nos a adaptar a tua carteira.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {USOS.map((o) => <Chip key={o.id} ativo={usos.includes(o.id)} onClick={() => toggle(usos, setUsos, o.id)}>{o.label}</Chip>)}
        </div>
        <FieldError>{erro}</FieldError>
        <Button size="lg" className="mt-6 w-full" disabled={usos.length === 0} onClick={() => { setErro(null); setPasso("metodos"); }}>
          Continuar <ArrowRight className="h-5 w-5" />
        </Button>
      </section>
    );
  }

  if (passo === "metodos") {
    return (
      <section className="rounded-3xl border border-black/5 bg-surface p-6 shadow-sm sm:p-8">
        <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-forest/70">Passo 2 de 4 · O teu ponto de partida</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-forest">Que métodos usavas antes?</h1>
        <p className="mt-1.5 text-sm font-medium text-ink/60">Para saberes como chegámos até ti — e o que melhoramos. Podes escolher mais do que um.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {METODOS.map((o) => <Chip key={o.id} ativo={metodos.includes(o.id)} onClick={() => toggle(metodos, setMetodos, o.id)}>{o.label}</Chip>)}
        </div>
        <FieldError>{erro}</FieldError>
        <div className="mt-6 flex items-center gap-3">
          <button onClick={() => setPasso("usos")} className="inline-flex items-center gap-1.5 text-sm font-bold text-ink/55 hover:text-ink"><ArrowLeft className="h-4 w-4" /> Voltar</button>
          <Button size="lg" className="flex-1" loading={loading} disabled={metodos.length === 0} onClick={avancarParaLimite}>
            Continuar <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>
    );
  }

  if (passo === "limite") {
    return (
      <section className="rounded-3xl border border-black/5 bg-surface p-6 shadow-sm sm:p-8">
        <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-forest/70">Passo 3 de 4 · O teu limite</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-forest">Conta verificada, limites a sério.</h1>

        <div className="mt-5 overflow-hidden rounded-2xl border border-forest/15 bg-lime-soft">
          <div className="border-b border-forest/10 px-5 py-4">
            <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-forest/70">Sem verificação</p>
            <p className="mt-1 text-xl font-extrabold text-forest">$2.000 USD <span className="text-sm font-bold text-forest/60">/ dia</span></p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-forest/70">Com verificação de identidade</p>
            <p className="mt-1 text-xl font-extrabold text-forest">$5.000 USD <span className="text-sm font-bold text-forest/60">/ dia</span></p>
            <ul className="mt-2 space-y-1 text-xs font-semibold text-forest/85">
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" strokeWidth={3} /> Limites maiores de depósito e levantamento</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" strokeWidth={3} /> Confiança extra para agentes e parceiros</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" strokeWidth={3} /> Processo rápido — análise manual pela equipa MOZOUT</li>
            </ul>
          </div>
        </div>

        <p className="mt-4 text-xs font-medium text-ink/55">A verificação (KYC) serve para proteger-te contra fraude e cumprir a lei. Os teus documentos são tratados em segurança e nunca são partilhados publicamente.</p>

        <div className="mt-5 flex flex-col gap-2">
          <Button size="lg" className="w-full" onClick={() => setPasso("kyc")}>
            <ShieldCheck className="h-5 w-5" /> Verificar a minha identidade
          </Button>
          <button onClick={() => router.push("/painel")} className="h-12 w-full text-center text-sm font-bold text-ink/55 underline underline-offset-4 hover:text-ink">
            Pular por agora
          </button>
        </div>
      </section>
    );
  }

  if (passo === "kyc") {
    return (
      <section className="rounded-3xl border border-black/5 bg-surface p-6 shadow-sm sm:p-8">
        <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-forest/70">Passo 4 de 4 · Verificação (KYC)</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-forest">Envia os teus documentos</h1>
        <p className="mt-1.5 mb-4 text-sm font-medium text-ink/60">Bilhete de Identidade, Passaporte ou Carta de condução + uma selfie.</p>
        <KycForm onSucesso={() => setPasso("concluido")} onVoltar={() => setPasso("limite")} />
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-black/5 bg-surface p-6 shadow-sm sm:p-8">
      <KycSucesso />
    </section>
  );
}
