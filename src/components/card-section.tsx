"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye, EyeOff, Copy, Snowflake, Sun, Info, CreditCard, Check, Loader2,
} from "lucide-react";
import { VirtualCard } from "./virtual-card";
import { Modal, Badge } from "./ui";
import { useToast } from "./toast";
import { cn, maskCard } from "@/lib/utils";
import { formatMoeda } from "@/lib/money";

interface CartaoDados {
  id: string;
  planNome: string;
  tipo: string;
  estado: "ativo" | "congelado" | "cancelado" | "pendente";
  validade: string;
  limiteMensal: number;
  gastosMesCents: number;
  ultimos4: string;
  titular: string;
}

export function CardSection({ cartao }: { cartao: CartaoDados }) {
  const router = useRouter();
  const { toast } = useToast();
  const [revelado, setRevelado] = React.useState(false);
  const [dados, setDados] = React.useState<{ numero: string; cvv: string } | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [detalhesAberto, setDetalhesAberto] = React.useState(false);
  const [copiado, setCopiado] = React.useState<string | null>(null);

  async function obterDados(): Promise<{ numero: string; cvv: string } | null> {
    if (dados) return dados;
    const resp = await fetch(`/api/cartoes/${cartao.id}/revelar`, { method: "POST" });
    const json = await resp.json().catch(() => null);
    if (!resp.ok) {
      toast("erro", "Não foi possível revelar o cartão", json?.erro);
      return null;
    }
    const novos = { numero: json.numero as string, cvv: json.cvv as string };
    setDados(novos);
    return novos;
  }

  async function alternarRevelar() {
    if (revelado) {
      setRevelado(false);
      return;
    }
    setBusy("revelar");
    const d = await obterDados();
    setBusy(null);
    if (d) setRevelado(true);
  }

  async function copiar(campo: "numero" | "cvv" | "validade") {
    setBusy(campo);
    try {
      let valor: string | null = null;
      if (campo === "validade") valor = cartao.validade;
      else {
        const d = await obterDados();
        valor = campo === "numero" ? d?.numero ?? null : d?.cvv ?? null;
      }
      if (valor) {
        await navigator.clipboard.writeText(campo === "numero" ? valor.replace(/\s/g, "") : valor);
        setCopiado(campo);
        toast("sucesso", campo === "numero" ? "Número copiado" : campo === "cvv" ? "CVV copiado" : "Validade copiada");
        window.setTimeout(() => setCopiado(null), 1800);
      }
    } finally {
      setBusy(null);
    }
  }

  async function alternarCongelado() {
    const acao = cartao.estado === "congelado" ? "descongelar" : "congelar";
    setBusy("congelar");
    const resp = await fetch(`/api/cartoes/${cartao.id}/estado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao }),
    });
    setBusy(null);
    if (resp.ok) {
      toast("sucesso", acao === "congelar" ? "Cartão congelado" : "Cartão descongelado", acao === "congelar" ? "Nenhum pagamento será autorizado." : "O cartão volta a estar operacional.");
      router.refresh();
    } else {
      const json = await resp.json().catch(() => null);
      toast("erro", "Não foi possível alterar o estado", json?.erro);
    }
  }

  const pctLimite = Math.min(100, (cartao.gastosMesCents / Math.max(cartao.limiteMensal * 100, 1)) * 100);
  const numeroParaCartao = revelado && dados ? dados.numero : cartao.ultimos4.padStart(16, "0");

  const acoes = [
    { id: "revelar", rotulo: revelado ? "Ocultar" : "Revelar", icon: revelado ? EyeOff : Eye, onClick: alternarRevelar },
    { id: "numero", rotulo: copiado === "numero" ? "Copiado!" : "Copiar nº", icon: copiado === "numero" ? Check : Copy, onClick: () => copiar("numero") },
    { id: "validade", rotulo: copiado === "validade" ? "Copiado!" : "Copiar validade", icon: copiado === "validade" ? Check : Copy, onClick: () => copiar("validade") },
    { id: "cvv", rotulo: copiado === "cvv" ? "Copiado!" : "Copiar CVV", icon: copiado === "cvv" ? Check : Copy, onClick: () => copiar("cvv") },
    { id: "congelar", rotulo: cartao.estado === "congelado" ? "Descongelar" : "Congelar", icon: cartao.estado === "congelado" ? Sun : Snowflake, onClick: alternarCongelado },
    { id: "detalhes", rotulo: "Detalhes", icon: Info, onClick: () => setDetalhesAberto(true) },
  ];

  return (
    <section aria-label="O teu cartão virtual" className="flex flex-col items-center rounded-[1.75rem] border border-black/5 bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex w-full items-center justify-between">
        <p className="flex items-center gap-2 text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-ink/50">
          <CreditCard className="h-4 w-4" /> Cartão virtual
        </p>
        <Badge tone={cartao.estado === "ativo" ? "green" : cartao.estado === "congelado" ? "amber" : "red"}>
          {cartao.estado === "ativo" ? "Ativo" : cartao.estado === "congelado" ? "Congelado" : cartao.estado}
        </Badge>
      </div>

      <VirtualCard
        numero={numeroParaCartao}
        validade={cartao.validade}
        cvv={revelado ? dados?.cvv : null}
        titular={cartao.titular}
        estado={cartao.estado}
        planNome={cartao.planNome}
        tipo={cartao.tipo}
        revelado={revelado}
        className="mt-4"
      />

      <div className="mt-4 grid w-full grid-cols-3 gap-2 sm:grid-cols-6">
        {acoes.map((acao) => (
          <button
            key={acao.id}
            onClick={acao.onClick}
            disabled={busy !== null}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border border-mist bg-cream px-2 py-2.5 text-[0.62rem] font-extrabold text-ink/75 transition-all hover:border-forest hover:text-forest disabled:opacity-60",
            )}
            aria-label={acao.rotulo}
          >
            {busy === acao.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <acao.icon className="h-4 w-4" strokeWidth={2} />}
            <span className="leading-tight">{acao.rotulo}</span>
          </button>
        ))}
      </div>

      {/* Detalhes do cartão */}
      <Modal open={detalhesAberto} onClose={() => setDetalhesAberto(false)} title="Detalhes do cartão">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            ["Plano", cartao.planNome],
            ["Titular", cartao.titular],
            ["Número", revelado && dados ? dados.numero.replace(/(.{4})/g, "$1 ").trim() : maskCard(cartao.ultimos4)],
            ["Validade", cartao.validade],
            ["Estado", cartao.estado === "ativo" ? "Ativo" : cartao.estado === "congelado" ? "Congelado" : "Cancelado"],
            ["Limite mensal", `$${cartao.limiteMensal.toLocaleString("pt-MZ", { minimumFractionDigits: 2 })}`],
          ].map(([k, v]) => (
            <div key={String(k)} className="rounded-2xl bg-sand/60 p-3">
              <dt className="text-[0.62rem] font-extrabold uppercase tracking-wider text-ink/50">{k}</dt>
              <dd className="mt-0.5 break-all font-mono text-[0.8rem] font-bold text-ink">{String(v)}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-bold text-ink/60">
            <span>Gasto este mês</span>
            <span>{formatMoeda(cartao.gastosMesCents, "USD")} de ${cartao.limiteMensal.toLocaleString("pt-MZ")}</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-mist">
            <div className="h-full rounded-full bg-forest transition-all" style={{ width: `${pctLimite}%` }} />
          </div>
        </div>
        <p className="mt-4 text-center text-[0.7rem] font-semibold text-ink/45">
          Problema com o cartão? <Link href="mailto:suporte@mozout.co.mz" className="text-forest underline underline-offset-2">Fala connosco</Link>
        </p>
      </Modal>
    </section>
  );
}
