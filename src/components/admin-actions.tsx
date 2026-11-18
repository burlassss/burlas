"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ShieldOff, ShieldCheck, LockKeyhole, Scale, Loader2 } from "lucide-react";
import { Button, Modal, Input, Label, FieldError } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

export function UsuarioAcoes({ id, nome, estado }: { id: string; nome: string; estado: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [saldoAberto, setSaldoAberto] = React.useState(false);
  const [valor, setValor] = React.useState("");
  const [motivo, setMotivo] = React.useState("");
  const [erro, setErro] = React.useState<string | null>(null);

  async function mudarEstado(novo: string) {
    setBusy(novo);
    try {
      const resp = await fetch(`/api/admin/utilizadores/${id}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: novo }),
      });
      const data = await resp.json();
      if (resp.ok) {
        toast("sucesso", `Utilizador atualizado`, `${nome} → ${novo}`);
        router.refresh();
      } else toast("erro", "Falha ao atualizar", data.erro);
    } finally {
      setBusy(null);
    }
  }

  async function aplicarSaldo(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const v = Number(valor.replace(",", "."));
    if (!Number.isFinite(v) || v === 0) return setErro("Introduz um valor diferente de zero (ex.: 25 ou -10.50).");
    if (motivo.trim().length < 5) return setErro("Indica o motivo do ajuste.");
    setBusy("saldo");
    try {
      const resp = await fetch(`/api/admin/utilizadores/${id}/saldo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valorUsd: v, motivo: motivo.trim() }),
      });
      const data = await resp.json();
      if (resp.ok) {
        toast("sucesso", "Saldo ajustado", `Novo saldo: $${Number(data.saldoResultante).toFixed(2)}`);
        setSaldoAberto(false);
        setValor("");
        setMotivo("");
        router.refresh();
      } else setErro(data.erro);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {estado !== "ativo" ? (
        <button onClick={() => mudarEstado("ativo")} disabled={!!busy} title="Reativar" className="rounded-lg bg-lime-soft p-2 text-forest hover:bg-lime" aria-label="Reativar utilizador">
          {busy === "ativo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        </button>
      ) : (
        <button onClick={() => mudarEstado("suspenso")} disabled={!!busy} title="Suspender" className="rounded-lg bg-amber-100 p-2 text-amber-800 hover:bg-amber-200" aria-label="Suspender utilizador">
          {busy === "suspenso" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
        </button>
      )}
      <button onClick={() => mudarEstado("bloqueado")} disabled={!!busy || estado === "bloqueado"} title="Bloquear" className="rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200 disabled:opacity-40" aria-label="Bloquear utilizador">
        {busy === "bloqueado" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
      </button>
      <button onClick={() => setSaldoAberto(true)} title="Ajuste de saldo" className="rounded-lg bg-violet-100 p-2 text-violet-800 hover:bg-violet-200" aria-label="Ajuste manual de saldo">
        <Scale className="h-4 w-4" />
      </button>

      <Modal open={saldoAberto} onClose={() => setSaldoAberto(false)} title={`Ajuste de saldo — ${nome}`}>
        <form onSubmit={aplicarSaldo} className="flex flex-col gap-3">
          <p className="text-xs font-medium leading-relaxed text-ink/55">Aplica um crédito ou débito diretamente no ledger, com motivo obrigatório e registo na auditoria. O saldo resultante fica visível no extrato do cliente como “Ajuste”.</p>
          <div>
            <Label htmlFor="valor-ajuste" hint="USD · negativo debita">Valor do ajuste</Label>
            <Input id="valor-ajuste" inputMode="decimal" placeholder="ex.: 25 ou -10.50" value={valor} onChange={(e) => setValor(e.target.value)} required autoFocus />
          </div>
          <div>
            <Label htmlFor="motivo-ajuste">Motivo</Label>
            <Input id="motivo-ajuste" placeholder="ex.: Compensação por depósito duplicado" value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
          </div>
          <FieldError>{erro}</FieldError>
          <Button type="submit" loading={busy === "saldo"}>Aplicar ajuste</Button>
        </form>
      </Modal>
    </div>
  );
}

export function CardAcoes({ id, estado }: { id: string; estado: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function acao(novo: string) {
    setBusy(novo);
    try {
      const resp = await fetch(`/api/admin/cartoes/${id}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: novo }),
      });
      if (resp.ok) {
        toast("sucesso", `Cartão ${novo === "ativo" ? "reativado" : novo === "congelado" ? "congelado" : "cancelado"}`);
        router.refresh();
      } else toast("erro", "Falha ao atualizar o cartão");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 text-[0.68rem] font-extrabold">
      {estado === "ativo" && <button onClick={() => acao("congelado")} disabled={!!busy} className="rounded-lg bg-amber-100 px-2.5 py-1.5 text-amber-800 hover:bg-amber-200">{busy === "congelado" ? "…" : "Congelar"}</button>}
      {estado === "congelado" && <button onClick={() => acao("ativo")} disabled={!!busy} className="rounded-lg bg-lime-soft px-2.5 py-1.5 text-forest hover:bg-lime">{busy === "ativo" ? "…" : "Reativar"}</button>}
      {estado !== "cancelado" && <button onClick={() => acao("cancelado")} disabled={!!busy} className="rounded-lg bg-red-100 px-2.5 py-1.5 text-red-700 hover:bg-red-200">{busy === "cancelado" ? "…" : "Cancelar"}</button>}
    </div>
  );
}
