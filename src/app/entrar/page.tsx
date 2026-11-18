"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button, Input, Label, FieldError } from "@/components/ui";

function EntrarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identificador, setIdentificador] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [mostrar, setMostrar] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErro(data.erro ?? "Não foi possível entrar. Verifica os teus dados.");
        return;
      }
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : data.destino ?? "/painel");
      router.refresh();
    } catch {
      setErro("Erro de ligação. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submeter} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="identificador">E-mail ou telefone</Label>
        <Input id="identificador" autoComplete="username" required placeholder="tu@exemplo.com ou +258 84 123 4567" value={identificador} onChange={(e) => setIdentificador(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="password">Palavra-passe</Label>
        <div className="relative">
          <Input id="password" type={mostrar ? "text" : "password"} autoComplete="current-password" required placeholder="A tua palavra-passe" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-12" />
          <button type="button" onClick={() => setMostrar((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink/45 hover:text-ink" aria-label={mostrar ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}>
            {mostrar ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <FieldError>{erro}</FieldError>
      <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
        Entrar <ArrowRight className="h-5 w-5" />
      </Button>
    </form>
  );
}

export default function EntrarPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Painel visual */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-pine p-10 text-cream lg:flex">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-lime/15 blur-3xl" />
        <Logo className="[&_span:last-child_span:first-child]:!text-cream" />
        <div className="relative">
          <p className="font-mono text-sm tracking-[0.3em] text-lime">4521&nbsp;&nbsp;••••&nbsp;&nbsp;••••&nbsp;&nbsp;1093</p>
          <h2 className="mt-6 max-w-md text-4xl font-extrabold leading-[1.05] tracking-[-0.03em]">
            Dólares no bolso,<br />mundo nas mãos.
          </h2>
          <p className="mt-4 max-w-sm font-medium text-cream/70">Deposita com M-Pesa, e-Mola ou USDT. Gasta com um cartão aceite em milhões de lojas.</p>
        </div>
        <p className="relative text-xs font-semibold text-cream/45">© 2026 MOZOUT-USD · Maputo</p>
      </div>

      {/* Formulário */}
      <div className="flex flex-col items-center justify-center bg-cream px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden"><Logo /></div>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-forest sm:text-4xl">Bem-vinda de volta</h1>
          <p className="mt-2 font-medium text-ink/60">Entra para veres o teu saldo, cartão e movimentos.</p>

          <div className="mt-8">
            <React.Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-sand" />}>
              <EntrarForm />
            </React.Suspense>
          </div>

          <p className="mt-6 text-center text-sm font-semibold text-ink/60">
            Ainda não tens conta?{" "}
            <Link href="/criar-conta" className="font-extrabold text-forest underline underline-offset-4 hover:text-moss">Criar conta grátis</Link>
          </p>

          <div className="mt-8 rounded-2xl border border-forest/15 bg-lime-soft p-4">
            <p className="flex items-center gap-2 text-[0.72rem] font-extrabold uppercase tracking-wider text-forest"><ShieldCheck className="h-4 w-4" /> Ambiente de demonstração</p>
            <ul className="mt-2 space-y-1 text-xs font-semibold text-forest/90">
              <li>Cliente — regista a tua conta (começa do zero)</li>
              <li>Agente M-Pesa · agente.mpesa@example.com / Agente#123</li>
              <li>Administração · admin@mozout.co.mz / Mozout#Admin2026</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
