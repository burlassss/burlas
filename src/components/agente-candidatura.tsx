"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Store, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button, Select, Label, Input, FieldError } from "@/components/ui";
import { useToast } from "@/components/toast";

export function AgenteCandidatura() {
  const { toast } = useToast();
  const [operadora, setOperadora] = React.useState<"mpesa" | "emola" | "ambas">("mpesa");
  const [limite, setLimite] = React.useState("1000");
  const [localizacao, setLocalizacao] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [enviado, setEnviado] = React.useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const limiteNum = Number(limite);
    if (!Number.isFinite(limiteNum) || limiteNum < 100) return setErro("O limite diário mínimo é MT equivalente a 100 USD.");
    if (localizacao.trim().length < 3) return setErro("Indica a tua localização (ex.: Maputo — Baixa).");
    setBusy(true);
    try {
      const resp = await fetch("/api/agente/candidatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operadora, limiteDiario: limiteNum, localizacao: localizacao.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) return setErro(data.erro);
      setEnviado(true);
      toast("sucesso", "Candidatura enviada", "Vamos analisar e responder por SMS e notificação.");
    } catch {
      setErro("Erro de ligação. Tenta novamente.");
    } finally {
      setBusy(false);
    }
  }

  if (enviado) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-3xl border border-black/5 bg-surface px-6 py-14 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-lime-soft"><CheckCircle2 className="h-9 w-9 text-forest" /></span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-forest">Candidatura recebida!</h1>
        <p className="mt-1.5 text-sm font-medium text-ink/60">A equipa MOZOUT vai analisar a tua candidatura. Quando fores aprovado, o teu painel de agente fica disponível automaticamente.</p>
        <Link href="/painel" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-forest px-6 font-extrabold text-lime hover:bg-moss">Ir para o painel <ArrowRight className="h-4 w-4" /></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest"><Store className="h-7 w-7 text-lime" strokeWidth={1.8} /></span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">Sê um Agente MOZOUT</h1>
          <p className="text-sm font-medium text-ink/55">Ganha comissão em cada depósito e levantamento processado.</p>
        </div>
      </div>

      <ul className="mt-5 grid gap-2 text-xs font-semibold text-ink/70">
        {["Comissão de 1,0% por operação (configurável)", "Escolhes o teu limite diário e horário de trabalho", "Pagamento das comissões direto na tua carteira", "Reputação pública: avaliações e taxa de conclusão"].map((t) => (
          <li key={t} className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest" />{t}</li>
        ))}
      </ul>

      <form onSubmit={submeter} className="mt-6 flex flex-col gap-4 rounded-3xl border border-black/5 bg-surface p-6">
        <div>
          <Label htmlFor="operadora">Operadora que opera</Label>
          <Select id="operadora" value={operadora} onChange={(e) => setOperadora(e.target.value as typeof operadora)}>
            <option value="mpesa">M-Pesa (Vodacom)</option>
            <option value="emola">e-Mola (Movitel)</option>
            <option value="ambas">Ambas</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="limite" hint="USD por dia">Limite diário que consegues cobrir</Label>
          <Input id="limite" type="number" min={100} step={50} value={limite} onChange={(e) => setLimite(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="local">Localização</Label>
          <Input id="local" placeholder="Maputo — Baixa" value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} required />
        </div>
        <FieldError>{erro}</FieldError>
        <Button type="submit" size="lg" loading={busy}>Enviar candidatura <ArrowRight className="h-5 w-5" /></Button>
      </form>
    </div>
  );
}
