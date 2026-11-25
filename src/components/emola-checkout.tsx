"use client";

/**
 * Fluxo de pagamento e-Mola reutilizável:
 *   dados (telefone + PIN) → OTP por SMS → confirmação → executado.
 * Com reutilização de sessão activa salta-se o OTP (captação imediata).
 * Com drain mode mostra-se o valor final (saldo total) para confirmação
 * explícita ANTES de qualquer débito.
 */
import React from "react";
import { Loader2, Smartphone, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
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
  const [reenviando, setReenviando] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const [nota, setNota] = React.useState<string | null>(null);

  // Cooldown do reenvio de OTP (60 s a entrar na etapa ou após cada reenvio)
  React.useEffect(() => {
    if (etapa !== "otp") return;
    const init = window.setTimeout(() => setCooldown(60), 0); // setState em callback, não síncrono no efeito
    const t = window.setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => {
      window.clearTimeout(init);
      window.clearInterval(t);
    };
  }, [etapa]);

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

  /** Reenvia o OTP (novo SMS) para a mesma cobrança — recuperação quando o código expira. */
  async function reenviarCodigo() {
    if (!inicio || reenviando || cooldown > 0) return;
    setReenviando(true);
    setErro(null);
    setNota(null);
    try {
      const resp = await fetch("/api/emola/checkout/reenviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cobrancaId: inicio.cobrancaId }),
      });
      const data: { otpDemo?: string; erro?: string } | null = await resp.json().catch(() => null);
      if (!resp.ok || !data) {
        setErro(data?.erro ?? "Não foi possível reenviar o código.");
        return;
      }
      setOtp(data.otpDemo ?? "");
      setCooldown(60);
      setNota(
        data.otpDemo
          ? `Novo código enviado (demo: ${data.otpDemo}) — usa sempre o SMS mais recente.`
          : `Novo código enviado para ${inicio.phone} — usa sempre o SMS mais recente.`,
      );
    } catch {
      setErro("Falha de ligação. Tenta novamente.");
    } finally {
      setReenviando(false);
    }
  }

  const valorConhecido = etapa === "otp" ? inicio?.valorMzn : etapa === "valor" ? valorFinal : inicio?.valorMzn;
  const drain = inicio?.drain ?? false;
  const erroDeOtp = etapa === "otp" && !!erro && /OTP|código/i.test(erro);

  return (
    <div className="flex flex-col gap-4">
      {/* Resumo */}
      <div className="rounded-2xl bg-sand/60 p-4 text-sm font-semibold text-ink/75">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink/50">
            <Smartphone className="h-3.5 w-3.5" /> Pagamento e-Mola
          </span>
        </div>
        {titulo && <p className="mt-2 font-extrabold text-ink">{titulo}</p>}
        {drain && (
          <p className="mt-1 text-[0.7rem] font-bold text-ink/45">Cobrança de saldo total — confirma o valor no final.</p>
        )}
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
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700">
          {erro}
          {erroDeOtp && (
            <p className="mt-1.5 font-semibold text-red-600/80">
              Código expirado ou de um SMS antigo? Usa o código mais recente ou pede um novo com «Reenviar código».
            </p>
          )}
        </div>
      )}
      {nota && etapa === "otp" && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3.5 text-xs font-bold text-sky-800">{nota}</div>
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
              ? "O valor final (saldo total da carteira) será calculado e mostrado para confirmares antes de qualquer débito."
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
              maxLength={8}
              className="text-center text-xl font-extrabold tracking-[0.4em]"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button size="lg" className="w-full" loading={busy} disabled={busy || otp.trim().length < 4} onClick={() => confirmar({ otp: otp.trim() })}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />} Confirmar pagamento
          </Button>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="text-xs font-bold text-ink/50 underline-offset-2 hover:text-ink hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => { setEtapa("dados"); setErro(null); setNota(null); setOtp(""); }}
              disabled={busy}
            >
              Corrigir dados
            </button>
            <button
              type="button"
              className="text-xs font-bold text-forest underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void reenviarCodigo()}
              disabled={busy || reenviando || cooldown > 0}
            >
              {reenviando ? "A reenviar…" : cooldown > 0 ? `Reenviar código (${cooldown}s)` : "Reenviar código"}
            </button>
          </div>
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

      {/* ── Etapa: valor final (saldo total) ─────────────────── */}
      {etapa === "valor" && inicio && (
        <div className="flex flex-col gap-3.5">
          <div className="rounded-2xl border-2 border-forest bg-sand/60 p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-forest/80">
              Valor final a debitar
            </p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-forest">
              {formatUnits(valorFinal ?? 0, "MZN")}
            </p>
            <p className="mt-1 text-xs font-semibold leading-snug text-ink/60">
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
