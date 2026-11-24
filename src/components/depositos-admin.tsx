"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Eye, Smartphone, Bitcoin, Loader2 } from "lucide-react";
import { Button, Modal, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";

interface DepositoResumo {
  id: string;
  referencia: string;
  valor_mzn: number | null;
  valor_liquido_usd: number | null;
  metodo: string;
  codigo_tx: string | null;
  criado_em: string;
  utilizador_nome?: string | null;
  agente_nome?: string | null;
}

export function DepositoAcoes({ deposito, podeAprovar = true }: { deposito: DepositoResumo; podeAprovar?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<"aprovar" | "recusar" | null>(null);
  const [ver, setVer] = React.useState(false);

  async function decidir(decisao: "aprovar" | "recusar") {
    setBusy(decisao);
    try {
      const resp = await fetch(`/api/admin/depositos/${deposito.id}/${decisao}`, { method: "POST" });
      const data = await resp.json();
      if (resp.ok) {
        toast("sucesso", decisao === "aprovar" ? "Depósito aprovado" : "Depósito recusado", decisao === "aprovar" ? "Carteira creditada e utilizador notificado." : "Utilizador notificado da recusa.");
        setVer(false);
        router.refresh();
      } else toast("erro", "Operação falhou", data.erro);
    } finally {
      setBusy(null);
    }
  }

  const IconeMetodo = deposito.metodo === "usdt_trc20" ? Bitcoin : Smartphone;
  const metodoLabel = deposito.metodo === "usdt_trc20" ? "USDT · TRC20" : deposito.metodo === "mpesa" ? "M-Pesa" : "e-Mola";

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <button onClick={() => setVer(true)} className="rounded-lg bg-sand p-2 text-ink/70 transition-colors hover:bg-mist" aria-label="Ver detalhes"><Eye className="h-4 w-4" /></button>
        {podeAprovar && <button onClick={() => decidir("aprovar")} disabled={!!busy} className="rounded-lg bg-lime-soft p-2 text-forest transition-colors hover:bg-lime disabled:opacity-50" aria-label="Aprovar depósito">
          {busy === "aprovar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        </button>}
        <button onClick={() => decidir("recusar")} disabled={!!busy} className="rounded-lg bg-red-100 p-2 text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50" aria-label="Recusar depósito">
          {busy === "recusar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
        </button>
      </div>

      <Modal open={ver} onClose={() => setVer(false)} title={`Depósito ${deposito.referencia}`}>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2 flex items-center gap-2 rounded-2xl bg-sand/60 px-4 py-3"><IconeMetodo className="h-5 w-5 text-forest" /><span className="font-extrabold uppercase text-ink">{metodoLabel}</span></div>
          <div><dt className="text-[0.6rem] font-extrabold uppercase text-ink/45">Valor MZN</dt><dd className="font-extrabold tabular-nums">{deposito.valor_mzn != null ? `MT ${deposito.valor_mzn.toFixed(2)}` : "—"}</dd></div>
          <div><dt className="text-[0.6rem] font-extrabold uppercase text-ink/45">Líquido USD</dt><dd className="font-extrabold tabular-nums">{deposito.valor_liquido_usd != null ? `$${deposito.valor_liquido_usd.toFixed(2)}` : "—"}</dd></div>
          <div className="col-span-2"><dt className="text-[0.6rem] font-extrabold uppercase text-ink/45">Cód. de transferência / referência</dt><dd className="font-mono text-sm font-bold break-all">{deposito.codigo_tx ?? "—"}</dd></div>
          <div className="col-span-2"><dt className="text-[0.6rem] font-extrabold uppercase text-ink/45">Cliente</dt><dd className="font-bold">{deposito.utilizador_nome ?? "—"}</dd></div>
          <div className="col-span-2"><dt className="text-[0.6rem] font-extrabold uppercase text-ink/45">{deposito.metodo === "usdt_trc20" ? "Origem" : "Agente confirmador"}</dt><dd className="font-bold">{deposito.agente_nome ?? "—"}</dd></div>
        </dl>
        <div className="mt-4 flex gap-2">
          <Button variant="danger" className="flex-1" loading={busy === "recusar"} onClick={() => decidir("recusar")}><XCircle className="h-4 w-4" /> Recusar</Button>
          {podeAprovar ? <Button className="flex-1" loading={busy === "aprovar"} onClick={() => decidir("aprovar")}><CheckCircle2 className="h-4 w-4" /> Aprovar & creditar</Button> : <p className="flex-1 self-center text-xs font-bold text-amber-800">À espera do agente confirmar a transferência recebida.</p>}
        </div>
      </Modal>
    </>
  );
}

export function LevantamentoEstorno({ id, referencia }: { id: string; referencia: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [confirma, setConfirma] = React.useState(false);
  const [motivo, setMotivo] = React.useState("");

  async function estornar() {
    if (motivo.trim().length < 5) {
      toast("erro", "Motivo obrigatório", "Indica o motivo do estorno (mín. 5 caracteres).");
      return;
    }
    setBusy(true);
    try {
      const resp = await fetch(`/api/admin/levantamentos/${id}/estornar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      const data = await resp.json();
      if (resp.ok) {
        toast("sucesso", "Levantamento estornado", "Valor devolvido à carteira e reservas libertadas.");
        setConfirma(false);
        setMotivo("");
        router.refresh();
      } else toast("erro", "Falha ao estornar", data.erro);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={() => setConfirma(true)} className="rounded-lg bg-violet-100 px-3 py-1.5 text-[0.68rem] font-extrabold text-violet-800 hover:bg-violet-200">Estornar</button>
      <Modal open={confirma} onClose={() => setConfirma(false)} title={`Estornar ${referencia}?`}>
        <p className="text-sm font-medium leading-relaxed text-ink/70">A carteira do cliente será creditada com o valor integral e as reservas serão libertadas.</p>
        <label className="mt-3 block text-[0.62rem] font-extrabold uppercase tracking-wider text-ink/50" htmlFor="motivo-estorno">Motivo do estorno</label>
        <input id="motivo-estorno" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="ex.: Agente não conseguiu transferir" className="mt-1.5 w-full rounded-2xl border-2 border-mist bg-surface p-3 text-sm font-medium outline-none focus:border-forest" autoFocus />
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setConfirma(false)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={busy} onClick={estornar}>Confirmar estorno</Button>
        </div>
      </Modal>
    </>
  );
}

export function DisputaAcoes({ id, estado }: { id: string; estado: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [resolucao, setResolucao] = React.useState("");

  async function resolver(novoEstado: "resolvida" | "recusada" | "em_analise") {
    if ((novoEstado === "resolvida" || novoEstado === "recusada") && resolucao.trim().length < 3) {
      toast("erro", "Resolução obrigatória", "Descreve a decisão aplicada.");
      return;
    }
    setBusy(novoEstado);
    try {
      const resp = await fetch(`/api/admin/disputas/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: novoEstado, resolucao: resolucao.trim() || undefined }),
      });
      const data = await resp.json();
      if (resp.ok) {
        toast("sucesso", novoEstado === "em_analise" ? "Disputa em análise" : "Disputa fechada");
        router.refresh();
      } else toast("erro", "Falha", data.erro);
    } finally {
      setBusy(null);
    }
  }

  if (estado === "resolvida" || estado === "recusada") return <Badge tone="green">Fechada</Badge>;

  return (
    <div className="flex min-w-56 flex-col gap-2">
      <input value={resolucao} onChange={(e) => setResolucao(e.target.value)} placeholder="Decisão / resolução…" className="rounded-xl border border-mist px-3 py-2 text-xs font-medium outline-none focus:border-forest" aria-label="Resolução da disputa" />
      <div className="flex gap-1.5">
        <button disabled={!!busy} onClick={() => resolver("em_analise")} className="rounded-lg bg-amber-100 px-2 py-1.5 text-[0.65rem] font-extrabold text-amber-800 hover:bg-amber-200">{busy === "em_analise" ? "…" : "Em análise"}</button>
        <button disabled={!!busy} onClick={() => resolver("resolvida")} className="rounded-lg bg-lime-soft px-2 py-1.5 text-[0.65rem] font-extrabold text-forest hover:bg-lime">{busy === "resolvida" ? "…" : "Resolver"}</button>
        <button disabled={!!busy} onClick={() => resolver("recusada")} className="rounded-lg bg-red-100 px-2 py-1.5 text-[0.65rem] font-extrabold text-red-700 hover:bg-red-200">{busy === "recusada" ? "…" : "Recusar"}</button>
      </div>
    </div>
  );
}
