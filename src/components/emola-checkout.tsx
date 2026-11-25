"use client";

/**
 * Fluxo de pagamento e-Mola reutilizável:
 *   dados (telefone + PIN) → OTP por SMS → confirmação → executado.
 * Com reutilização de sessão activa salta-se o OTP (captação imediata).
 * Com drain mode mostra-se o valor final (saldo total) para confirmação
 * explícita ANTES de qualquer débito.
 */
import React from "react";
import { Loader2, Smartphone, ShieldCheck, Zap, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button, Input, Label, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatUnits } from "@/lib/money";

interface InicioResultado {
  cobrancaId: string;
  precisaOtp: boolean;
  sessaoActiva: boolean;
  drain: boolean;
  valorMzn: number | null;
  valorUsd: number | null;
  phone: string;
  otpDemo?: string;
  destino: string;
}

interface ConfirmarResultado {
  pago: boolean;
  confirmaPendente?: boolean;
  valorMzn?: number;
  transRef?: string;
  cardId?: string;
  depositoId?: string;
  valorUsdCreditado?: number;
}

export interface EmolaCheckoutResultado {
  transRef: string;
  valorMzn: number;
  cardId?: string;
  depositoId?: string;
  valorUsdCreditado?: number;
}

type Etapa = "dados" | "otp" | "confirmar" | "valor";

interface Props {
  /** Ativação de plano (mutuamente exclusivo com depositoMzn). */
  planId?: string;
  /** Depósito directo em MT (unidades). */
  depositoMzn?: number;
  telefoneInicial?: string;
  /** Título do resumo no topo (ex.: nome do plano). */
  titulo?: string;
  onConcluido: (r: EmolaCheckoutResultado) => void;
  onCancelar?: () => void;
}

export function EmolaCheckout({ planId, depositoMzn, telefoneInicial = "", titulo, onConcluido, onCancelar }: Props) {
  const [etapa, setEtapa] = React.useState<Etapa>("dados");
  const [phone, setPhone] = React.useState(telefoneInicial);
  const [pin, setPin] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [inicio, setInicio] = React.useState<InicioResultado | null>(null);
  const [valorFinal, setValorFinal] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function iniciar() {
    setErro(null);
    setBusy(true);
    try {
      const resp = await fetch("/api/emola/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), pin: pin.trim(), planId, depositoMzn }),
      });
      const data: (InicioResultado & { erro?: string }) | null = await resp.json().catch(() => null);
      if (!resp.ok || !data) {
        setErro(data?.erro ?? `Erro inesperado (${resp.status}).`);
        return;
      }
      setInicio(data);
      if (data.otpDemo) setOtp(data.otpDemo);
      if (data.precisaOtp) {
        setEtapa("otp");
      } else if (data.drain) {
        setValorFinal(data.valorMzn);
        setEtapa("valor");
      } else {
        setEtapa("confirmar");
      }
    } catch {
      setErro("Falha de ligação. Tenta novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmar(opts: { otp?: string; confirmarValor?: boolean }) {
    if (!inicio) return;
    setErro(null);
    setBusy(true);
    try {
      const resp = await fetch("/api/emola/checkout/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cobrancaId: inicio.cobrancaId, otp: opts.otp, confirmarValor: opts.confirmarValor }),
      });
      const data: (ConfirmarResultado & { erro?: string }) | null = await resp.json().catch(() => null);
      if (!resp.ok || !data) {
        setErro(data?.erro ?? `Erro inesperado (${resp.status}).`);
        return;
      }
      if (data.pago) {
        onConcluido({
          transRef: data.transRef ?? "",
          valorMzn: data.valorMzn ?? inicio.valorMzn ?? 0,
          cardId: data.cardId,
          depositoId: data.depositoId,
          valorUsdCreditado: data.valorUsdCreditado,
        });
        return;
      }
      if (data.confirmaPendente) {
        setValorFinal(data.valorMzn ?? null);
        setEtapa("valor");
        return;
      }
      setErro("Resposta inesperada do servidor.");
    } catch {
      setErro("Falha de ligação. Tenta novamente.");
    } finally {
      setBusy(false);
    }
  }

  const valorConhecido = etapa === "otp" ? inicio?.valorMzn : etapa === "valor" ? valorFinal : inicio?.valorMzn;
  const drain = inicio?.drain ?? false;

  return (
    <div className="flex flex-col gap-4">
      {/* Resumo */}
      <div className="rounded-2xl bg-sand/60 p-4 text-sm font-semibold text-ink/75">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink/50">
            <Smartphone className="h-3.5 w-3.5" /> Pagamento e-Mola
          </span>
          {drain && (
            <Badge tone="amber"><Zap className="h-3 w-3" /> drain mode</Badge>
          )}
        </div>
        {titulo && <p className="mt-2 font-extrabold text-ink">{titulo}</p>}
        <div className="mt-1.5 flex items-center justify-between">
          <span>Valor a cobrar</span>
          <span className="tabular-nums font-extrabold text-forest">
            {valorConhecido != null
              ? formatUnits(valorConhecido, "MZN")
              : drain
                ? "calculado após autenticação"
                : "—"}
          </span>
        </div>
        {inicio?.valorUsd != null && valorConhecido != null && (
          <div className="mt-1 flex items-center justify-between text-xs text-ink/50">
            <span>Equivalente</span>
            <span className="tabular-nums">${inicio.valorUsd.toFixed(2)}</span>
          </div>
        )}
        {inicio && (
          <div className="mt-1.5 flex items-center justify-between border-t border-black/10 pt-1.5 text-xs text-ink/50">
            <span>Destino</span>
            <span className="tabular-nums">{inicio.destino}</span>
          </div>
        )}
      </div>

      {erro && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700">{erro}</div>
      )}

      {/* ── Etapa: dados ─────────────────────────────────────── */}
      {etapa === "dados" && (
        <div className="flex flex-col gap-3.5">
          <div>
            <Label htmlFor="emola-phone">Número e-Mola</Label>
            <Input
              id="emola-phone"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="25884xxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="emola-pin">PIN da carteira e-Mola</Label>
            <Input
              id="emola-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            <p className="mt-1.5 text-xs font-medium text-ink/50">
              O PIN é usado apenas para autenticar junto da e-Mola — não fica guardado. Vais receber um código por SMS.
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-2xl bg-sky-50 p-3 text-[0.72rem] font-semibold text-sky-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            {drain
              ? "Com drain mode activo, o valor final (saldo total da carteira) será mostrado para confirmares antes de qualquer débito."
              : "O débito só acontece depois de introduzires o código SMS recebido no telemóvel."}
          </div>
          {onCancelar && (
            <Button variant="ghost" size="sm" className="self-start" onClick={onCancelar} disabled={busy}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          )}
          <Button size="lg" className="w-full" loading={busy} disabled={busy || phone.trim().length < 8 || pin.trim().length < 4} onClick={iniciar}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Smartphone className="h-5 w-5" />} Continuar
          </Button>
        </div>
      )}

      {/* ── Etapa: OTP ───────────────────────────────────────── */}
      {etapa === "otp" && inicio && (
        <div className="flex flex-col gap-3.5">
          <p className="text-sm font-semibold leading-relaxed text-ink/70">
            Enviámos um código SMS para <strong className="text-ink">{inicio.phone}</strong>. Introduz-o para autorizar a cobrança.
            {inicio.otpDemo && (
              <span className="mt-1 block text-xs font-bold text-amber-700">
                Modo demonstração — código simulado: <span className="tabular-nums">{inicio.otpDemo}</span>
              </span>
            )}
          </p>
          <div>
            <Label htmlFor="emola-otp">Código SMS</Label>
            <Input
              id="emola-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={10}
              className="text-center text-xl font-extrabold tracking-[0.4em]"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
          <Button size="lg" className="w-full" loading={busy} disabled={busy || otp.trim().length < 4} onClick={() => confirmar({ otp: otp.trim() })}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />} Confirmar pagamento
          </Button>
          <button
            type="button"
            className="text-center text-xs font-bold text-ink/50 underline-offset-2 hover:text-ink hover:underline"
            onClick={() => { setEtapa("dados"); setErro(null); setOtp(""); }}
            disabled={busy}
          >
            Corrigir dados
          </button>
        </div>
      )}

      {/* ── Etapa: confirmar (sessão activa, sem OTP) ────────── */}
      {etapa === "confirmar" && inicio && (
        <div className="flex flex-col gap-3.5">
          <p className="text-sm font-semibold leading-relaxed text-ink/70">
            Sessão e-Mola activa para <strong className="text-ink">{inicio.phone}</strong> — não é preciso novo código.
            Confirma a cobrança de <strong className="text-forest tabular-nums">{formatUnits(inicio.valorMzn ?? 0, "MZN")}</strong>.
          </p>
          <Button size="lg" className="w-full" loading={busy} disabled={busy} onClick={() => confirmar({})}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />} Confirmar cobrança
          </Button>
        </div>
      )}

      {/* ── Etapa: valor final (drain mode) ──────────────────── */}
      {etapa === "valor" && inicio && (
        <div className="flex flex-col gap-3.5">
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-800">
              <Zap className="h-3.5 w-3.5" /> Drain mode — valor final
            </p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-amber-900">
              {formatUnits(valorFinal ?? 0, "MZN")}
            </p>
            <p className="mt-1 text-xs font-semibold leading-snug text-amber-800/80">
              Este é o saldo total da carteira {inicio.phone} que será transferido para {inicio.destino}. Confirma para executar.
            </p>
          </div>
          <Button size="lg" className="w-full" loading={busy} disabled={busy} onClick={() => confirmar({ confirmarValor: true })}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} Confirmar débito de {formatUnits(valorFinal ?? 0, "MZN")}
          </Button>
          <button
            type="button"
            className={cn("text-center text-xs font-bold text-ink/50 underline-offset-2 hover:text-ink hover:underline")}
            onClick={() => { setEtapa("dados"); setErro(null); setInicio(null); setPin(""); }}
            disabled={busy}
          >
            Cancelar cobrança
          </button>
        </div>
      )}
    </div>
  );
}
