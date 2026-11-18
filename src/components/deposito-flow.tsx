"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Copy, Check, ShieldAlert, Loader2,
  Smartphone, Bitcoin, Star, MapPin, Timer, Receipt, ExternalLink, BadgeCheck,
  Search, UserRoundSearch, Hourglass, PartyPopper, Wallet, AlertCircle, RefreshCw,
} from "lucide-react";
import { Button, Input, Label, FieldError } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { formatMoeda } from "@/lib/money";

type Metodo = "usdt_trc20" | "mpesa" | "emola";

interface CotacaoMobile {
  taxaBase: number;
  taxaEfetiva: number;
  margemPct: number;
  valorUsdCents: number;
  taxaDepositoCents: number;
  valorLiquidoCents: number;
  taxaPct: number;
  comissaoAgenteCents: number;
}
interface AgenteInfo {
  id: string;
  nome: string;
  telefone: string;
  localizacao: string | null;
  avaliacao_media: number;
  operacoes_concluidas: number;
  tempo_resposta_min: number;
  operadora: string;
}
interface DepositoInfo {
  id: string;
  referencia: string;
  valor_usd: number;
  valor_liquido_usd: number | null;
  valor_mzn: number | null;
  endereco_pagamento: string | null;
  estado: string;
  metodo: Metodo;
}
type Etapa = "metodo" | "valor" | "procurar" | "sem-agente" | "agente" | "aguardando" | "recebido" | "instrucoes" | "concluido";

export function DepositoFlow({ demo }: { demo: boolean }) {
  const { toast } = useToast();
  const [etapa, setEtapa] = React.useState<Etapa>("metodo");
  const [metodo, setMetodo] = React.useState<Metodo>("usdt_trc20");
  const [valorUsd, setValorUsd] = React.useState("100");
  const [valorMzn, setValorMzn] = React.useState("10 000");
  const [cotacao, setCotacao] = React.useState<CotacaoMobile | null>(null);
  const [cotando, setCotando] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [deposito, setDeposito] = React.useState<DepositoInfo | null>(null);
  const [agente, setAgente] = React.useState<AgenteInfo | null>(null);
  const [codigo, setCodigo] = React.useState("");
  const [copiado, setCopiado] = React.useState<string | null>(null);

  const mznNumero = Number(valorMzn.replace(/\s/g, "").replace(",", ".")) || 0;
  const cotacaoVisivel = mznNumero >= 100 ? cotacao : null;

  // Cotação ao vivo (debounce) para M-Pesa / e-Mola
  React.useEffect(() => {
    if (etapa !== "valor" || metodo === "usdt_trc20" || mznNumero < 100) return;
    const t = window.setTimeout(async () => {
      setCotando(true);
      try {
        const resp = await fetch(`/api/depositos/cotacao?metodo=${metodo}&mzn=${mznNumero}`);
        if (resp.ok) setCotacao(await resp.json()); else setCotacao(null);
      } catch {
        setCotacao(null);
      } finally {
        setCotando(false);
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [mznNumero, metodo, etapa]);

  async function copiar(valor: string, chave: string) {
    await navigator.clipboard.writeText(valor);
    setCopiado(chave);
    toast("sucesso", "Copiado para a área de transferência");
    window.setTimeout(() => setCopiado(null), 1800);
  }

  async function criarDeposito() {
    setErro(null);
    setBusy(true);
    try {
      if (metodo === "usdt_trc20") {
        const valor = Number(valorUsd.replace(",", "."));
        if (!Number.isFinite(valor) || valor < 10) { setErro("O mínimo são $10.00."); return; }
        const resp = await fetch("/api/depositos/usdt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valorUsd: valor }) });
        const data = await resp.json();
        if (!resp.ok) { setErro(data.erro); return; }
        setDeposito({ ...data.deposito, metodo: "usdt_trc20" });
        setEtapa("instrucoes");
      } else {
        if (mznNumero < 100) { setErro("O mínimo são MT 100,00."); return; }
        // Vai direto para a animação de procura; o pedido real dispara ao entrar em “procurar”.
        setErro(null);
        setEtapa("procurar");
      }
    } catch {
      setErro("Erro de ligação. Tenta novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function simularPagamento() {
    if (!deposito) return;
    setBusy(true);
    try {
      const resp = await fetch(`/api/depositos/${deposito.id}/simular-pagamento`, { method: "POST" });
      if (resp.ok) setEtapa("concluido");
      else toast("erro", "Não foi possível simular");
    } finally {
      setBusy(false);
    }
  }

  async function submeterCodigo() {
    if (!deposito) return;
    if (!/^[A-Za-z0-9-]{5,32}$/.test(codigo.trim())) { setErro("Código inválido — verifica o SMS/USSD da tua carteira."); return; }
    setErro(null);
    setBusy(true);
    try {
      const resp = await fetch(`/api/depositos/${deposito.id}/codigo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo: codigo.trim() }) });
      const data = await resp.json();
      if (!resp.ok) { setErro(data.erro); return; }
      setEtapa("aguardando");
    } finally {
      setBusy(false);
    }
  }

  /* ───────── Etapa “procurar agente” (M-Pesa / e-Mola) ───────── */
  if (etapa === "procurar") {
    return (
      <ProcuraAgente
        metodo={metodo}
        mznNumero={mznNumero}
        onCancelar={() => setEtapa("valor")}
        onEncontrado={(dep, ag) => { setDeposito(dep); setAgente(ag); setEtapa("agente"); }}
        onSemAgente={() => setEtapa("sem-agente")}
      />
    );
  }

  /* ───────── Sem agente disponível ───────── */
  if (etapa === "sem-agente") {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-black/5 bg-surface px-6 py-12 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
          <AlertCircle className="h-8 w-8 text-amber-600" strokeWidth={1.7} />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-forest">Nenhum agente disponível</h1>
        <p className="mt-1.5 max-w-sm text-sm font-medium leading-relaxed text-ink/60">
          Neste momento não há agentes {metodo === "mpesa" ? "M-Pesa" : "e-Mola"} com capacidade para aceitar o teu depósito. Tenta novamente dentro de instantes ou usa USDT (TRC20), que é automático.
        </p>
        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={() => setEtapa("procurar")}><RefreshCw className="h-5 w-5" /> Tentar novamente</Button>
          <Button size="lg" variant="outline" onClick={() => { setMetodo("usdt_trc20"); setEtapa("valor"); }}><Bitcoin className="h-5 w-5" /> Usar USDT</Button>
        </div>
      </div>
    );
  }

  /* ───────── Agente encontrado: instruções + código ───────── */
  if (etapa === "agente" && deposito) {
    const operador = metodo === "mpesa" ? "M-Pesa" : "e-Mola";
    const transferir = (deposito.valor_mzn ?? 0).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const iniciais = agente ? agente.nome.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") : "?";
    return (
      <div className="animate-rise-in">
        <PassoCabecalho passo={3} titulo="Transfere para o agente" subtitulo="O agente verificado foi encontrado e está à tua espera." voltar={false} />

        {/* Cartão do agente */}
        {agente && (
          <div className="overflow-hidden rounded-3xl border border-forest/15 bg-surface shadow-lift">
            <div className="flex items-center gap-3 bg-forest p-3.5 text-cream min-[380px]:gap-4 min-[380px]:p-4 sm:p-5">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-lime font-black text-pine">
                <span className="text-lg">{iniciais}</span>
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-extrabold">{agente.nome} <BadgeCheck className="h-4 w-4 shrink-0 text-lime" /></p>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-lime/80">Agente verificado · {operador}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[0.68rem] font-semibold text-cream/75">
                  <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {agente.avaliacao_media.toFixed(1)} · {agente.operacoes_concluidas} ops</span>
                  <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> ~{agente.tempo_resposta_min} min</span>
                  {agente.localizacao && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {agente.localizacao}</span>}
                </div>
              </div>
            </div>
            {/* Número para transferir */}
            <div className="flex items-center justify-between gap-3 border-b border-black/5 p-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.2em] text-ink/45">Número do agente · {operador}</p>
                <a href={`tel:${agente.telefone}`} className="mt-0.5 block break-all font-mono text-base font-black tracking-wide text-forest min-[380px]:text-lg sm:text-xl">{agente.telefone}</a>
              </div>
              <button onClick={() => copiar(agente.telefone, "telefone")} className="shrink-0 rounded-2xl bg-sand p-3 text-forest transition-colors hover:bg-mist" aria-label="Copiar número do agente">
                {copiado === "telefone" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
            {/* Montante + passos */}
            <div className="grid grid-cols-2 gap-2 p-4 sm:p-5">
              <div className="rounded-2xl bg-lime-soft p-4 text-center">
                <p className="text-[0.58rem] font-extrabold uppercase tracking-wider text-forest/60">Transfere exatamente</p>
                <p className="mt-0.5 break-words text-lg font-extrabold tabular-nums text-forest min-[380px]:text-2xl">MT {transferir}</p>
              </div>
              <div className="rounded-2xl bg-sand/60 p-4 text-center">
                <p className="text-[0.58rem] font-extrabold uppercase tracking-wider text-ink/45">Recebes na carteira</p>
                <p className="mt-0.5 truncate text-xl font-extrabold tabular-nums text-ink min-[380px]:text-2xl">{formatMoeda(Math.round((deposito.valor_liquido_usd ?? 0) * 100), "USD")}</p>
              </div>
            </div>
            <ol className="px-5 pb-4 text-[0.78rem] font-semibold leading-snug text-ink/70">
              <li className="flex gap-2"><span className="font-extrabold text-forest">1.</span> Abre o {operador} e escolhe <em>Transferir dinheiro</em>.</li>
              <li className="mt-1 flex gap-2"><span className="font-extrabold text-forest">2.</span> Cola o número do agente e envia <strong>MT {transferir}</strong>.</li>
              <li className="mt-1 flex gap-2"><span className="font-extrabold text-forest">3.</span> Confirma com o teu PIN e guarda o código da transação.</li>
            </ol>
            <div className="flex items-center justify-between gap-2 border-t border-black/5 p-3 sm:px-5">
              <span className="text-[0.65rem] font-bold text-ink/55">Ref: <span className="font-mono">{deposito.referencia}</span></span>
              <button onClick={() => copiar(deposito.referencia, "ref")} className="rounded-lg p-1.5 hover:bg-sand" aria-label="Copiar referência">
                {copiado === "ref" ? <Check className="h-4 w-4 text-forest" /> : <Copy className="h-4 w-4 text-ink/50" />}
              </button>
            </div>
          </div>
        )}

        {/* Código da transação */}
        <div className="mt-4 rounded-3xl border border-black/5 bg-surface p-5">
          <Label htmlFor="codigo-tx">ID da transação</Label>
          <p className="mb-2 mt-0.5 text-xs font-medium text-ink/55">Cola aqui o código do SMS/USSD que recebeste após a transferência (ex.: MP2411XK92). Cada código só pode ser usado uma vez.</p>
          <div className="flex gap-2">
            <Input id="codigo-tx" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="MP2411XK92" className="font-mono uppercase" autoComplete="off" autoFocus />
            <Button onClick={submeterCodigo} loading={busy} size="md" className="shrink-0">Submeter</Button>
          </div>
          <FieldError>{erro}</FieldError>
        </div>
      </div>
    );
  }

  /* ───────── Aguardando aprovação (com polling) ───────── */
  if (etapa === "aguardando" && deposito) {
    return (
      <EsperaConfirmacao
        deposito={deposito}
        onRecebido={() => setEtapa("recebido")}
        onRecusado={(motivo) => { setErro(motivo ?? "Depósito recusado."); setEtapa("concluido"); }}
      />
    );
  }

  /* ───────── Recebido! (celebração) ───────── */
  if (etapa === "recebido" && deposito) {
    return (
      <div className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-black/5 bg-surface px-6 py-12 text-center">
        {/* burst de fundo */}
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-24 h-40 w-40 -translate-x-1/2 rounded-full bg-lime/30 animate-burst-ring" />
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-lime animate-pop-in">
          <PartyPopper className="h-10 w-10 text-pine" strokeWidth={1.8} />
        </span>
        <h1 className="relative mt-5 text-3xl font-extrabold tracking-tight text-forest">Recebido!</h1>
        <p className="relative mt-1.5 max-w-sm text-sm font-medium leading-relaxed text-ink/60">
          <strong className="text-forest">{formatMoeda(Math.round((deposito.valor_liquido_usd ?? 0) * 100), "USD")}</strong> foram creditados na tua carteira. Referência <span className="font-mono">{deposito.referencia}</span>.
        </p>
        <div className="relative mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/painel" className="flex h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 font-extrabold text-lime hover:bg-moss"><Wallet className="h-4 w-4" /> Ir para o painel</Link>
          <Link href="/extrato" className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-mist px-6 font-extrabold text-ink hover:border-forest"><Receipt className="h-4 w-4" /> Ver extrato</Link>
        </div>
      </div>
    );
  }

  /* ─────────────── Passo 1 · Escolher método ─────────────── */
  if (etapa === "metodo") {
    const cartoes: { id: Metodo; titulo: string; descricao: string; badge?: string; icon: React.ElementType; nota: string }[] = [
      { id: "usdt_trc20", titulo: "USDT (TRC20)", descricao: "Cripto, crédito automático após confirmação na rede.", badge: "Recomendado · 0,5%", icon: Bitcoin, nota: "Crédito em ~1–10 min" },
      { id: "mpesa", titulo: "M-Pesa", descricao: "Encontramos um agente verificado perto de ti, na hora.", icon: Smartphone, nota: "Comissão incluída · 1,5%" },
      { id: "emola", titulo: "e-Mola", descricao: "Encontramos um agente e-Mola verificado, na hora.", icon: Smartphone, nota: "Comissão incluída · 1,5%" },
    ];
    return (
      <div>
        <PassoCabecalho passo={1} titulo="Como queres depositar?" subtitulo="Escolhe o método — todos convertem para dólares na tua carteira." voltar={false} />
        <div className="grid gap-3">
          {cartoes.map((c) => (
            <button
              key={c.id}
              onClick={() => { setMetodo(c.id); setErro(null); setEtapa("valor"); }}
              className="group flex items-center gap-4 rounded-3xl border-2 border-mist bg-surface p-4 min-[380px]:p-5 text-left transition-all hover:border-forest hover:shadow-md sm:p-5"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-lime-soft text-forest transition-transform group-hover:scale-105">
                <c.icon className="h-7 w-7" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-extrabold tracking-tight text-ink">{c.titulo}</span>
                  {c.badge && <span className="rounded-full bg-forest px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wider text-lime">{c.badge}</span>}
                </span>
                <span className="mt-0.5 block text-xs font-medium leading-snug text-ink/60">{c.descricao}</span>
                <span className="mt-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink/40">{c.nota}</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-ink/30 transition-transform group-hover:translate-x-1 group-hover:text-forest" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ─────────────── Passo 2 · Valor ─────────────── */
  if (etapa === "valor") {
    const isCrypto = metodo === "usdt_trc20";
    return (
      <div>
        <PassoCabecalho
          passo={2}
          titulo={isCrypto ? "Quanto queres depositar?" : `Depositar via ${metodo === "mpesa" ? "M-Pesa" : "e-Mola"}`}
          subtitulo={isCrypto ? "Indica o valor em dólares (mínimo $10)." : "Indica o valor em meticais — nós encontramos o agente."}
          voltar onVoltar={() => setEtapa("metodo")}
        />

        {isCrypto ? (
          <div className="rounded-3xl border border-black/5 bg-surface p-4 min-[380px]:p-6">
            <Label htmlFor="valor-usd">Valor em dólares</Label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-3xl font-extrabold text-ink/30">$</span>
              <input
                id="valor-usd"
                inputMode="decimal"
                value={valorUsd}
                onChange={(e) => setValorUsd(e.target.value.replace(/[^\d.,]/g, ""))}
                className="h-16 w-full rounded-2xl border-2 border-mist bg-cream pl-11 text-3xl min-[380px]:h-20 min-[380px]:pl-12 min-[380px]:text-4xl font-extrabold tracking-tight text-forest focus:border-forest focus:outline-none"
                aria-describedby="valor-usd-ajuda"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2" id="valor-usd-ajuda">
              {["25", "50", "100", "250", "500"].map((v) => (
                <button key={v} onClick={() => setValorUsd(v)} className="rounded-full border border-mist bg-surface px-4 py-2 text-sm font-extrabold text-ink/70 transition-colors hover:border-forest hover:text-forest">${v}</button>
              ))}
            </div>
            <ResumoLinha label="Taxa da plataforma (0,5%)" valor={`$${((Number(valorUsd.replace(",", ".")) || 0) * 0.005).toFixed(2)}`} />
            <ResumoLinha label="Recebes na carteira" destaque valor={`$${((Number(valorUsd.replace(",", ".")) || 0) * 0.995).toFixed(2)}`} />
          </div>
        ) : (
          <div className="rounded-3xl border border-black/5 bg-surface p-4 min-[380px]:p-6">
            <Label htmlFor="valor-mzn">Valor em meticais (MZN)</Label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-extrabold text-ink/30">MT</span>
              <input
                id="valor-mzn"
                inputMode="decimal"
                value={valorMzn}
                onChange={(e) => setValorMzn(e.target.value.replace(/[^\d\s.,]/g, ""))}
                className="h-16 w-full rounded-2xl border-2 border-mist bg-cream pl-14 text-3xl min-[380px]:h-20 min-[380px]:pl-16 min-[380px]:text-4xl font-extrabold tracking-tight text-forest focus:border-forest focus:outline-none"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["1 000", "5 000", "20 000", "50 000"].map((v) => (
                <button key={v} onClick={() => setValorMzn(v)} className="rounded-full border border-mist bg-surface px-4 py-2 text-sm font-extrabold text-ink/70 transition-colors hover:border-forest hover:text-forest">MT {v}</button>
              ))}
            </div>

            {/* Cotação ao vivo */}
            <div className="mt-4 rounded-2xl bg-sand/60 p-4 text-sm font-semibold text-ink/75">
              {cotando ? (
                <p className="flex items-center gap-2 text-ink/50"><Loader2 className="h-4 w-4 animate-spin" /> A calcular…</p>
              ) : cotacaoVisivel ? (
                <>
                  <div className="flex items-center justify-between gap-2"><span>Cotação</span><span className="text-right">1 USD = MT {cotacaoVisivel.taxaBase.toFixed(2)} · margem {cotacaoVisivel.margemPct.toFixed(2)}%</span></div>
                  <div className="mt-1.5 flex items-center justify-between"><span>Valor em dólares</span><span>{formatMoeda(cotacaoVisivel.valorUsdCents, "USD")}</span></div>
                  <div className="mt-1.5 flex items-center justify-between"><span>Taxa depósito ({cotacaoVisivel.taxaPct}%)</span><span>−{formatMoeda(cotacaoVisivel.taxaDepositoCents, "USD")}</span></div>
                  <div className="mt-1.5 flex items-center justify-between border-t border-black/10 pt-2 font-extrabold text-forest"><span>Recebes</span><span>{formatMoeda(cotacaoVisivel.valorLiquidoCents, "USD")}</span></div>
                </>
              ) : (
                <p className="text-ink/45">Introduz um valor igual ou maior que MT 100,00 para veres a conversão.</p>
              )}
            </div>
          </div>
        )}

        <FieldError>{erro}</FieldError>
        <Button size="lg" className="mt-4 w-full" loading={busy} onClick={criarDeposito}>
          {isCrypto ? <>Continuar <ArrowRight className="h-5 w-5" /></> : <><UserRoundSearch className="h-5 w-5" /> Encontrar agente agora</>}
        </Button>
      </div>
    );
  }

  /* ─────────────── Passo 3 · Instruções USDT ─────────────── */
  if (etapa === "instrucoes" && deposito) {
    return (
      <div>
        <PassoCabecalho passo={3} titulo="Envia o USDT" subtitulo="Só é creditado após a rede confirmar — nunca antes." voltar={false} />
        <div className="rounded-3xl border border-black/5 bg-surface p-4 min-[380px]:p-6">
          <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-ink/45">Endereço de depósito · TRC20</p>
          <div className="mt-2 flex items-center gap-2 rounded-2xl border-2 border-dashed border-mist bg-cream p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-xs font-bold text-forest">{deposito.endereco_pagamento}</code>
            <button onClick={() => deposito.endereco_pagamento && copiar(deposito.endereco_pagamento, "endereco")} className="shrink-0 rounded-xl bg-forest p-2.5 text-lime hover:bg-moss" aria-label="Copiar endereço">
              {copiado === "endereco" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-[0.72rem] font-semibold leading-snug text-amber-900">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Envia apenas USDT na rede Tron (TRC20). Outras moedas ou redes resultam em perda permanente dos fundos.
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-sand/60 p-4">
              <p className="text-[0.6rem] font-extrabold uppercase tracking-wider text-ink/45">Enviar exatamente</p>
              <p className="mt-1 text-2xl font-extrabold text-forest">${deposito.valor_usd.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl bg-sand/60 p-4">
              <p className="text-[0.6rem] font-extrabold uppercase tracking-wider text-ink/45">Referência</p>
              <p className="mt-1 font-mono text-sm font-bold text-ink">{deposito.referencia}</p>
            </div>
          </div>
          <LinhaTempo etapas={["Aguardando pagamento na rede", "Pagamento identificado", "Confirmações da rede", "Crédito na carteira"]} atual={0} />
          {demo && (
            <Button variant="dark" className="mt-4 w-full" loading={busy} onClick={simularPagamento}>
              Simular confirmação na rede (demonstração)
            </Button>
          )}
          <Link href="/extrato" className="mt-2 flex h-11 items-center justify-center gap-2 text-xs font-extrabold text-ink/50 hover:text-forest">
            Ver o estado no extrato <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  /* ─────────────── Fim de fluxo (erro/recusa) ou concluído USDT ─────────────── */
  return (
    <div className="flex flex-col items-center rounded-3xl border border-black/5 bg-surface px-6 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-lime-soft">
        <CheckCircle2 className="h-9 w-9 text-forest" strokeWidth={1.8} />
      </span>
      <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-forest">{erro ? "Depósito recusado" : deposito?.metodo === "usdt_trc20" ? "Pagamento confirmado!" : "Pedido recebido"}</h2>
      <p className="mt-1.5 max-w-sm text-sm font-medium text-ink/60">{erro ?? (deposito?.metodo === "usdt_trc20" ? `${formatMoeda(Math.round((deposito?.valor_liquido_usd ?? 0) * 100), "USD")} foram creditados na tua carteira.` : "A tua operação segue para análise.")}</p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/painel" className="flex h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 font-extrabold text-lime hover:bg-moss">Ir para o painel <ArrowRight className="h-4 w-4" /></Link>
        <Link href="/extrato" className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-mist px-6 font-extrabold text-ink hover:border-forest"><Receipt className="h-4 w-4" /> Ver extrato</Link>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   PROCURA DE AGENTE — radar + contagem decrescente de 30s
   ════════════════════════════════════════════════════════ */
function ProcuraAgente({
  metodo,
  mznNumero,
  onCancelar,
  onEncontrado,
  onSemAgente,
}: {
  metodo: Metodo;
  mznNumero: number;
  onCancelar: () => void;
  onEncontrado: (d: DepositoInfo, agente: AgenteInfo | null) => void;
  onSemAgente: () => void;
}) {
  const operador = metodo === "mpesa" ? "M-Pesa" : "e-Mola";
  const [restante, setRestante] = React.useState(30);
  const [fase, setFase] = React.useState<"procurando" | "encontrado">("procurando");
  const respostaRef = React.useRef<{ deposito: DepositoInfo | null; agente: AgenteInfo | null; erro: boolean } | null>(null);
  const [pronto, setPronto] = React.useState(false);

  // Dispara o pedido real uma única vez, ao montar
  React.useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const resp = await fetch("/api/depositos/mobile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metodo, valorMzn: mznNumero }),
        });
        const data = await resp.json().catch(() => null);
        if (!ativo) return;
        if (!resp.ok || !data?.deposito) {
          respostaRef.current = { deposito: null, agente: null, erro: true };
        } else {
          respostaRef.current = { deposito: { ...data.deposito, metodo }, agente: data.agente ?? null, erro: false };
        }
      } catch {
        if (ativo) respostaRef.current = { deposito: null, agente: null, erro: true };
      }
    })();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Contagem decrescente de 30s
  React.useEffect(() => {
    const t = window.setInterval(() => setRestante((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Espera mínima aleatória de 10–15s antes de revelar o resultado
  React.useEffect(() => {
    const minimo = 10_000 + Math.random() * 5_000;
    const t = window.setTimeout(() => setPronto(true), minimo);
    return () => window.clearTimeout(t);
  }, []);

  // Quando o tempo mínimo passou E a resposta chegou → revela
  React.useEffect(() => {
    if (!pronto) return;
    const verificar = () => {
      const r = respostaRef.current;
      if (!r) return false; // ainda não respondeu — o 30s de segurança trata disso
      if (r.erro || !r.agente || !r.deposito) {
        onSemAgente();
        return true;
      }
      setFase("encontrado");
      window.setTimeout(() => onEncontrado(r.deposito!, r.agente), 1700);
      return true;
    };
    if (verificar()) return;
    const t = window.setInterval(() => { if (verificar()) window.clearInterval(t); }, 300);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto]);

  // Segurança: se os 30s acabarem sem resposta → falha com retry
  React.useEffect(() => {
    if (restante === 0 && pronto === false) {
      const r = respostaRef.current;
      if (!r) onSemAgente();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restante]);

  const pct = restante / 30;
  const R = 54;
  const circunf = 2 * Math.PI * R;

  return (
    <div className="flex flex-col items-center overflow-hidden rounded-3xl border border-black/5 bg-surface px-6 py-10 text-center">
      {fase === "procurando" ? (
        <>
          <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.24em] text-forest/70">A encontrar agente verificado</p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-forest">Procurando no mapa MOZOUT…</h1>

          {/* Radar com anel de contagem decrescente */}
          <div className="relative mt-5 flex h-44 w-44 items-center justify-center min-[380px]:h-48 min-[380px]:w-48 sm:h-56 sm:w-56">
            {/* ondas */}
            <span aria-hidden className="absolute inset-0 rounded-full bg-forest/10 animate-radar" />
            <span aria-hidden className="absolute inset-0 rounded-full bg-forest/15 animate-radar" style={{ animationDelay: "0.8s" }} />
            <span aria-hidden className="absolute inset-0 rounded-full bg-forest/20 animate-radar" style={{ animationDelay: "1.6s" }} />
            {/* círculo com progresso 30s */}
            <svg viewBox="0 0 128 128" className="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="64" cy="64" r={R} fill="none" stroke="#e9eae4" strokeWidth="7" />
              <circle
                cx="64" cy="64" r={R} fill="none" stroke="#163c2b" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={circunf}
                strokeDashoffset={circunf * (1 - pct)}
                style={{ transition: "stroke-dashoffset 0.9s linear" }}
              />
            </svg>
            {/* varredura */}
            <div className="absolute inset-[13%] overflow-hidden rounded-full border border-forest/15 bg-gradient-to-br from-lime-soft to-cream">
              <div aria-hidden className="absolute inset-0 animate-radar-sweep" style={{ background: "conic-gradient(from 0deg, rgb(169 244 77 / 0.55), transparent 70deg, transparent 360deg)" }} />
              <div aria-hidden className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, transparent 58%, rgb(22 60 43 / 0.08) 100%)" }} />
            </div>
            {/* núcleo */}
            <span className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-forest shadow-lift animate-pulse-soft">
              <Smartphone className="h-9 w-9 text-lime" strokeWidth={1.8} />
            </span>
          </div>

          {/* contagem */}
          <p className="mt-5 font-mono text-3xl font-black min-[380px]:text-4xl tabular-nums tracking-tight text-forest" aria-live="polite">
            00:{String(restante).padStart(2, "0")}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-ink/45">segundos restantes</p>
          <p className="mt-3 max-w-xs text-sm font-medium leading-relaxed text-ink/55">
            Estamos a contactar os agentes {operador} disponíveis perto de ti. Normalmente demora menos de 15 segundos.
            <span aria-hidden> <span className="dot-blink">●</span> <span className="dot-blink">●</span> <span className="dot-blink">●</span></span>
          </p>
          <button onClick={onCancelar} className="mt-5 text-xs font-extrabold text-ink/45 underline underline-offset-4 hover:text-ink">Cancelar e voltar</button>
        </>
      ) : (
        /* ——— Agente encontrado! ——— */
        <div className="flex flex-col items-center py-4">
          <div className="relative flex h-36 w-36 items-center justify-center">
            <span aria-hidden className="absolute inset-0 rounded-full border-4 border-lime/60 animate-burst-ring" />
            <span aria-hidden className="absolute inset-4 rounded-full border-4 border-lime/40 animate-burst-ring" style={{ animationDelay: "0.18s" }} />
            <span aria-hidden className="absolute inset-8 rounded-full border-4 border-lime/30 animate-burst-ring" style={{ animationDelay: "0.36s" }} />
            <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-forest animate-pop-in">
              <BadgeCheck className="h-12 w-12 text-lime" strokeWidth={1.6} />
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-forest animate-rise-in">Agente encontrado!</h1>
          <p className="mt-1 text-sm font-semibold text-ink/60">A preparar o teu pedido com segurança…</p>
          <p className="mt-4 flex items-center gap-1.5 font-mono text-[0.7rem] font-bold uppercase tracking-[0.2em] text-forest/70"><Search className="h-4 w-4" /> Ligando à rede MOZOUT…</p>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   ESPERA DE CONFIRMAÇÃO — polling + passos animados
   ════════════════════════════════════════════════════════ */
function EsperaConfirmacao({
  deposito,
  onRecebido,
  onRecusado,
}: {
  deposito: DepositoInfo;
  onRecebido: () => void;
  onRecusado: (motivo: string | null) => void;
}) {
  const [estado, setEstado] = React.useState(deposito.estado);
  const tentativas = React.useRef(0);

  React.useEffect(() => {
    let ativo = true;
    const t = window.setInterval(async () => {
      tentativas.current += 1;
      try {
        const resp = await fetch(`/api/depositos/${deposito.id}`);
        if (!resp.ok || !ativo) return;
        const data = await resp.json();
        if (!ativo) return;
        setEstado(data.estado);
        if (data.estado === "aprovado") { window.clearInterval(t); onRecebido(); }
        else if (data.estado === "recusado" || data.estado === "falhou") { window.clearInterval(t); onRecusado(data.motivo_recusa ?? null); }
      } catch { /* tenta no próximo ciclo */ }
      if (tentativas.current > 150) window.clearInterval(t); // ~10 minutos
    }, 4000);
    return () => { ativo = false; window.clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deposito.id]);

  const aprovado = estado === "aprovado";
  const passos = [
    { label: "Código da transação recebido", feito: true },
    { label: "Agente confirmou a transferência", feito: false, aDecorrer: true },
    { label: "Equipa MOZOUT aprovou o depósito", feito: false, aDecorrer: false },
  ];

  return (
    <div className="flex flex-col items-center rounded-3xl border border-black/5 bg-surface px-6 py-10 text-center">
      {/* radar de espera */}
      <div className="relative flex h-40 w-40 items-center justify-center">
        <span aria-hidden className="absolute inset-0 rounded-full bg-forest/8 animate-radar" />
        <span aria-hidden className="absolute inset-0 rounded-full bg-forest/12 animate-radar" style={{ animationDelay: "1.1s" }} />
        <span className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-pine shadow-lift">
          <Hourglass className="h-10 w-10 animate-pulse-soft text-lime" strokeWidth={1.6} />
        </span>
      </div>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-forest">{aprovado ? "Confirmado!" : "A aguardar confirmação…"}</h1>
      <p className="mt-1 max-w-sm text-sm font-medium leading-relaxed text-ink/60">O agente e a equipa MOZOUT estão a verificar a tua transferência. Recebes SMS e notificação assim que for aprovado — podes fechar esta página.</p>
      <div className="mt-3 rounded-2xl border border-black/5 bg-sand/50 px-5 py-2.5 font-mono text-xs font-bold text-ink/70">Ref. {deposito.referencia}</div>

      {/* passos */}
      <ol className="mt-5 w-full max-w-sm text-left">
        {passos.map((p, i) => (
          <li key={i} className="flex items-center gap-3 py-1.5">
            <span className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
              p.feito ? "border-forest bg-forest text-lime" : p.aDecorrer ? "border-forest" : "border-mist",
            )}>
              {p.feito ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : p.aDecorrer ? <span className="h-2.5 w-2.5 animate-pulse-soft rounded-full bg-forest" /> : null}
            </span>
            <span className={cn("text-xs font-bold", p.feito ? "text-forest" : p.aDecorrer ? "text-ink" : "text-ink/35")}>{p.label}</span>
          </li>
        ))}
      </ol>
      <Link href="/painel" className="mt-5 text-xs font-extrabold text-ink/45 underline underline-offset-4 hover:text-ink">Voltar ao painel — avisamos-te por SMS</Link>
    </div>
  );
}

/* ───────────────────────── Subcomponentes ───────────────────────── */
function PassoCabecalho({ passo, titulo, subtitulo, voltar, onVoltar }: { passo: number; titulo: string; subtitulo?: string; voltar?: boolean; onVoltar?: () => void }) {
  return (
    <div className="mb-5">
      {voltar && onVoltar && (
        <button onClick={onVoltar} className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold text-ink/55 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
      )}
      <div className="flex items-center gap-1.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1.5 rounded-full transition-all", i <= passo ? "w-10 bg-forest" : "w-5 bg-mist")} />
        ))}
      </div>
      <h1 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-forest sm:text-3xl">{titulo}</h1>
      {subtitulo && <p className="mt-1 font-medium text-ink/60">{subtitulo}</p>}
    </div>
  );
}

function ResumoLinha({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 border-t border-black/8 pt-2.5 text-sm font-semibold", destaque ? "mt-2.5 font-extrabold text-forest" : "mt-2.5 text-ink/65")}>
      <span>{label}</span>
      <span className="tabular-nums">{valor}</span>
    </div>
  );
}

function LinhaTempo({ etapas, atual }: { etapas: string[]; atual: number }) {
  return (
    <ol className="mt-4 space-y-0">
      {etapas.map((e, i) => {
        const feito = i < atual;
        const ativo = i === atual;
        return (
          <li key={i} className="flex items-center gap-3">
            <span className="flex flex-col items-center">
              <span className={cn("h-3.5 w-3.5 rounded-full border-2", feito ? "border-forest bg-forest" : ativo ? "border-forest bg-lime" : "border-mist bg-surface")} />
              {i < etapas.length - 1 && <span className={cn("h-7 w-0.5", feito ? "bg-forest" : "bg-mist")} />}
            </span>
            <span className={cn("pb-4 text-xs font-bold", ativo ? "text-forest" : feito ? "text-ink/60" : "text-ink/35")}>{e}</span>
          </li>
        );
      })}
    </ol>
  );
}
