"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft, ArrowUpRight, Check, X, CheckCheck, Star, Timer, Wallet,
  ShieldCheck, CircleDollarSign, BadgePercent, Send, Loader2, Store,
} from "lucide-react";
import { Button, Input, Badge, EmptyState } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { formatMoeda } from "@/lib/money";
import { TempoRelativo } from "@/components/tempo-relativo";

export interface OrdemView {
  id: string;
  tipo: "deposito" | "levantamento";
  estado: string;
  expira_em: string;
  criado_em: string;
  deposito?: { id: string; referencia: string; valor_mzn: number | null; valor_liquido_usd: number | null; metodo: string; codigo_tx: string | null; estado: string } | null;
  levantamento?: { id: string; referencia: string; valor_liquido_mzn: number | null; metodo: string; destino: string } | null;
}

export interface AgenteStats {
  comissoesCents: number;
  taxaConclusao: number;
  totalOperacoes: number;
  concluidas: number;
  avaliacao: number;
  limiteDiario: number;
  disponivel: boolean;
  estado: string;
}

export function AgentePanel({ stats, pendentes, historico }: { stats: AgenteStats; pendentes: OrdemView[]; historico: OrdemView[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [refs, setRefs] = React.useState<Record<string, string>>({});
  const [tab, setTab] = React.useState<"pendentes" | "historico">("pendentes");

  async function toggleDisponivel() {
    setBusy("disp");
    try {
      const resp = await fetch("/api/agente/disponibilidade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disponivel: !stats.disponivel }),
      });
      if (resp.ok) {
        toast("sucesso", stats.disponivel ? "Pausaste a receção de ordens" : "Estás disponível para ordens");
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function acaoOrdem(id: string, acao: "aceitar" | "recusar") {
    setBusy(`${acao}:${id}`);
    try {
      const resp = await fetch(`/api/agente/ordens/${id}/${acao}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await resp.json();
      if (resp.ok) {
        toast("sucesso", acao === "aceitar" ? "Ordem aceite" : "Ordem recusada", acao === "aceitar" ? "Procede conforme as instruções." : "A ordem volta a ficar disponível para reatribuição.");
        router.refresh();
      } else {
        toast("erro", "Não foi possível atualizar a ordem", data.erro);
      }
    } finally {
      setBusy(null);
    }
  }

  async function confirmarDeposito(depositoId: string) {
    setBusy(`conf-dep:${depositoId}`);
    try {
      const resp = await fetch(`/api/agente/depositos/${depositoId}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (resp.ok) {
        toast("sucesso", "Recebimento confirmado", "A equipa MOZOUT faz a aprovação final.");
        router.refresh();
      } else toast("erro", "Não foi possível confirmar", data.erro);
    } finally {
      setBusy(null);
    }
  }

  async function marcarEnviado(withdrawalId: string) {
    const ref = refs[withdrawalId]?.trim();
    if (!ref || ref.length < 5) {
      toast("erro", "Introduz a referência", "A referência M-Pesa/e-Mola da transferência enviada.");
      return;
    }
    setBusy(`env:${withdrawalId}`);
    try {
      const resp = await fetch(`/api/agente/levantamentos/${withdrawalId}/enviado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenciaTx: ref }),
      });
      const data = await resp.json();
      if (resp.ok) {
        toast("sucesso", "Marcado como enviado", "O cliente vai confirmar a receção.");
        router.refresh();
      } else toast("erro", "Não foi possível marcar", data.erro);
    } finally {
      setBusy(null);
    }
  }

  if (stats.estado === "pendente") {
    return (
      <div className="mx-auto mt-8 max-w-md rounded-3xl border border-amber-300 bg-amber-50 p-6 text-center">
        <Timer className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-3 text-xl font-extrabold text-amber-900">Conta de agente em análise</h1>
        <p className="mt-1.5 text-sm font-medium text-amber-800">A equipa MOZOUT está a rever a tua candidatura. Assim que fores aprovado, recebes uma notificação e este painel fica ativo.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">Painel do agente</h1>
          <p className="text-sm font-medium text-ink/55">Ordens atribuídas, comissões e reputação — tudo num só lugar.</p>
        </div>
        <button
          onClick={toggleDisponivel}
          disabled={busy === "disp"}
          role="switch"
          aria-checked={stats.disponivel}
          className={cn(
            "flex h-12 items-center gap-2.5 rounded-full border-2 px-4 text-sm font-extrabold transition-all",
            stats.disponivel ? "border-forest bg-forest text-lime" : "border-mist bg-surface text-ink/60",
          )}
        >
          <span className={cn("h-2.5 w-2.5 rounded-full", stats.disponivel ? "animate-pulse bg-lime" : "bg-ink/30")} />
          {stats.disponivel ? "Disponível para ordens" : "Indisponível"}
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoStat label="Comissões acumuladas" valor={formatMoeda(stats.comissoesCents, "USD")} icon={CircleDollarSign} />
        <CartaoStat label="Taxa de conclusão" valor={`${stats.taxaConclusao.toFixed(0)}%`} hint={`${stats.concluidas} de ${stats.totalOperacoes} operações`} icon={BadgePercent} />
        <CartaoStat label="Avaliação" valor={`${stats.avaliacao.toFixed(1)} / 5`} icon={Star} destaque={stats.avaliacao >= 4.5} />
        <CartaoStat label="Limite diário" valor={`$${stats.limiteDiario.toLocaleString("pt-MZ")}`} hint="Capacidade declarada" icon={Wallet} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2" role="tablist">
        {([["pendentes", `Ordens (${pendentes.length})`], ["historico", "Histórico"]] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn("rounded-full px-5 py-2 text-xs font-extrabold uppercase tracking-wide transition-all", tab === id ? "bg-forest text-lime" : "border border-mist bg-surface text-ink/60")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pendentes" ? (
        pendentes.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="h-6 w-6 text-forest" />} title="Sem ordens de momento" description="Quando receberes uma ordem de depósito ou levantamento, ela aparece aqui com o cronómetro." />
        ) : (
          <div className="grid gap-3">
            {pendentes.map((ordem) => (
              <OrdemCard
                key={ordem.id}
                ordem={ordem}
                busy={busy}
                referencia={refs[ordem.levantamento?.id ?? ""] ?? ""}
                onReferencia={(v) => setRefs((r) => ({ ...r, [ordem.levantamento!.id]: v }))}
                onAceitar={() => acaoOrdem(ordem.id, "aceitar")}
                onRecusar={() => acaoOrdem(ordem.id, "recusar")}
                onConfirmarDeposito={() => ordem.deposito && confirmarDeposito(ordem.deposito.id)}
                onMarcarEnviado={() => ordem.levantamento && marcarEnviado(ordem.levantamento.id)}
              />
            ))}
          </div>
        )
      ) : (
        historico.length === 0 ? (
          <EmptyState icon={<Store className="h-6 w-6 text-forest" />} title="Ainda sem histórico" description="As tuas operações concluídas e canceladas aparecem aqui." />
        ) : (
          <ul className="divide-y divide-black/5 overflow-hidden rounded-3xl border border-black/5 bg-surface">
            {historico.map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-5 py-4">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", o.tipo === "deposito" ? "bg-lime-soft text-forest" : "bg-amber-100 text-amber-800")}>
                  {o.tipo === "deposito" ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{o.tipo === "deposito" ? "Depósito" : "Levantamento"} · {o.deposito?.referencia ?? o.levantamento?.referencia}</p>
                  <p className="text-[0.68rem] font-semibold text-ink/45"><TempoRelativo iso={o.criado_em} /></p>
                </div>
                <Badge tone={o.estado === "concluida" ? "green" : "zinc"}>{o.estado}</Badge>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

function CartaoStat({ label, valor, hint, icon: Icon, destaque }: { label: string; valor: string; hint?: string; icon: React.ElementType; destaque?: boolean }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-surface p-4">
      <Icon className={cn("h-5 w-5", destaque ? "text-amber-500" : "text-forest")} strokeWidth={1.8} />
      <p className="mt-2 text-[0.6rem] font-extrabold uppercase tracking-wider text-ink/50">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold tracking-tight text-ink">{valor}</p>
      {hint && <p className="text-[0.62rem] font-semibold text-ink/45">{hint}</p>}
    </div>
  );
}

function Cronometro({ ate }: { ate: string }) {
  const [restante, setRestante] = React.useState("--:--");
  const [critico, setCritico] = React.useState(false);

  React.useEffect(() => {
    const alvo = new Date(ate).getTime();
    const tick = () => {
      const diff = alvo - Date.now();
      if (diff <= 0) { setRestante("expirada"); setCritico(true); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRestante(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      setCritico(diff < 120_000);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [ate]);

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[0.68rem] font-extrabold tabular-nums", critico ? "animate-pulse bg-red-100 text-red-700" : "bg-sand text-ink/60")}>
      <Timer className="h-3 w-3" /> {restante}
    </span>
  );
}

function OrdemCard({
  ordem, busy, referencia, onReferencia, onAceitar, onRecusar, onConfirmarDeposito, onMarcarEnviado,
}: {
  ordem: OrdemView;
  busy: string | null;
  referencia: string;
  onReferencia: (v: string) => void;
  onAceitar: () => void;
  onRecusar: () => void;
  onConfirmarDeposito: () => void;
  onMarcarEnviado: () => void;
}) {
  const pendente = ordem.estado === "pendente";
  const isDeposito = ordem.tipo === "deposito";
  const dep = ordem.deposito;
  const lev = ordem.levantamento;

  return (
    <article className="rounded-3xl border border-black/5 bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", isDeposito ? "bg-lime-soft text-forest" : "bg-amber-100 text-amber-800")}>
            {isDeposito ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-sm font-extrabold text-ink">{isDeposito ? "Depósito para verificar" : "Levantamento para pagar"}</p>
            <p className="font-mono text-[0.66rem] font-bold text-ink/45">{dep?.referencia ?? lev?.referencia} · <TempoRelativo iso={ordem.criado_em} /></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={pendente ? "amber" : "blue"}>{pendente ? "Aguardando aceite" : "Em curso"}</Badge>
          <Cronometro ate={ordem.expira_em} />
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-sand/60 p-3.5 text-sm font-semibold text-ink/75">
        {isDeposito && dep && (
          <>
            <div className="flex items-center justify-between"><span>Cliente transfere</span><strong className="text-forest">MT {dep.valor_mzn?.toLocaleString("pt-MZ", { minimumFractionDigits: 2 })}</strong></div>
            <div className="mt-1 flex items-center justify-between"><span>Crédito na carteira</span><span className="tabular-nums">{formatMoeda(Math.round((dep.valor_liquido_usd ?? 0) * 100), "USD")}</span></div>
            {dep.codigo_tx && <div className="mt-1 flex items-center justify-between"><span>Código informado</span><span className="font-mono font-bold text-forest">{dep.codigo_tx}</span></div>}
          </>
        )}
        {!isDeposito && lev && (
          <>
            <div className="flex items-center justify-between"><span>Transferir para</span><strong className="font-mono text-forest">{lev.destino}</strong></div>
            <div className="mt-1 flex items-center justify-between"><span>Valor exato</span><strong className="text-forest">MT {lev.valor_liquido_mzn?.toLocaleString("pt-MZ", { minimumFractionDigits: 2 })}</strong></div>
            <p className="mt-1 text-[0.66rem] text-ink/50">Método: {lev.metodo === "mpesa" ? "M-Pesa" : "e-Mola"} · a comissão é paga pela MOZOUT</p>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {pendente ? (
          <>
            <Button size="sm" onClick={onAceitar} loading={busy === `aceitar:${ordem.id}`}><Check className="h-4 w-4" /> Aceitar</Button>
            <Button size="sm" variant="ghost" onClick={onRecusar} loading={busy === `recusar:${ordem.id}`} className="text-red-600 hover:bg-red-50"><X className="h-4 w-4" /> Recusar</Button>
          </>
        ) : isDeposito ? (
          dep?.codigo_tx ? (
            <Button size="sm" variant="dark" onClick={onConfirmarDeposito} loading={busy === `conf-dep:${dep?.id}`}><CheckCheck className="h-4 w-4" /> Confirmar recebimento</Button>
          ) : <p className="text-xs font-semibold text-ink/50">À espera de o cliente submeter o código da transferência.</p>
        ) : (
          <div className="flex w-full flex-wrap items-center gap-2">
            <Input
              value={referencia}
              onChange={(e) => onReferencia(e.target.value.toUpperCase())}
              placeholder="Referência M-Pesa/e-Mola (ex.: MP77451ZX)"
              className="h-11 max-w-xs font-mono uppercase"
              aria-label="Referência da transferência"
            />
            <Button size="sm" variant="dark" onClick={onMarcarEnviado} loading={busy === `env:${lev?.id}`}><Send className="h-4 w-4" /> Marcar como enviado</Button>
          </div>
        )}
      </div>
    </article>
  );
}
