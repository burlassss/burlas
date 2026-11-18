"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button, Input, Label, FieldError, FieldHint } from "@/components/ui";
import { cn } from "@/lib/utils";

function forcaSenha(senha: string): { nivel: number; texto: string } {
  let pontos = 0;
  if (senha.length >= 8) pontos++;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++;
  if (/\d/.test(senha)) pontos++;
  if (/[^A-Za-z0-9]/.test(senha)) pontos++;
  return [
    { nivel: 0, texto: "Mínimo 8 caracteres" },
    { nivel: 1, texto: "Fraca" },
    { nivel: 2, texto: "Razoável" },
    { nivel: 3, texto: "Forte" },
    { nivel: 4, texto: "Excelente" },
  ][pontos];
}

export default function CriarContaPage() {
  const router = useRouter();
  const [passo, setPasso] = React.useState<1 | 2>(1);
  const [loading, setLoading] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({ nome: "", nascimento: "", telefone: "+258 ", email: "", password: "", termos: false });
  const [telefoneConfirmado, setTelefoneConfirmado] = React.useState("");
  const [demoCode, setDemoCode] = React.useState<string | null>(null);
  const [codigo, setCodigo] = React.useState(["", "", "", "", "", ""]);
  const [reenvioEm, setReenvioEm] = React.useState(0);
  const caixas = React.useRef<(HTMLInputElement | null)[]>([]);

  const forca = forcaSenha(form.password);
  const telefoneValido = /^\+[1-9]\d{7,14}$/.test(form.telefone.replace(/\s/g, ""));

  async function submeterDados(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!form.termos) return setErro("Precisas de aceitar os Termos e a Política de Privacidade.");
    if (!telefoneValido) return setErro("Telefone inválido. Usa o formato internacional, ex.: +258 84 123 4567.");
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/registar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, telefone: form.telefone.replace(/\s/g, "") }),
      });
      const data = await resp.json();
      if (!resp.ok) return setErro(data.erro ?? "Não foi possível criar a conta.");
      setTelefoneConfirmado(form.telefone.replace(/\s/g, ""));
      setDemoCode(data.demoCode ?? null);
      setPasso(2);
      setReenvioEm(30);
    } catch {
      setErro("Erro de ligação. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (reenvioEm <= 0) return;
    const t = setInterval(() => setReenvioEm((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [reenvioEm]);

  async function verificar(e?: React.FormEvent) {
    e?.preventDefault();
    const code = codigo.join("");
    if (code.length !== 6) return setErro("Introduz os 6 dígitos do código.");
    setErro(null);
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: telefoneConfirmado, codigo: code, proposito: "registo" }),
      });
      const data = await resp.json();
      if (!resp.ok) return setErro(data.erro ?? "Código inválido.");
      router.push("/painel");
      router.refresh();
    } catch {
      setErro("Erro de ligação. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function reenviar() {
    setErro(null);
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/reenviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: telefoneConfirmado, proposito: "registo" }),
      });
      const data = await resp.json();
      if (!resp.ok) return setErro(data.erro ?? "Não foi possível reenviar o código.");
      setDemoCode(data.demoCode ?? null);
      setReenvioEm(30);
    } finally {
      setLoading(false);
    }
  }

  function caixaCodigo(i: number, valor: string) {
    const digito = valor.replace(/\D/g, "").slice(-1);
    const novo = [...codigo];
    novo[i] = digito;
    setCodigo(novo);
    if (digito && i < 5) caixas.current[i + 1]?.focus();
    if (novo.every((d) => d) && novo.join("").length === 6) setTimeout(() => verificar(), 120);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel visual */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-pine p-10 text-cream lg:flex">
        <div aria-hidden className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-lime/10 blur-3xl" />
        <Logo className="[&_span:last-child_span:first-child]:!text-cream" />
        <div className="relative space-y-5">
          {[
            { t: "Carteira em dólares", d: "Recebe, guarda e gasta USD como um local." },
            { t: "Cartão virtual VISA", d: "Aceite em milhões de lojas online, no momento." },
            { t: "M-Pesa, e-Mola e USDT", d: "Deposita com o que já tens. Nós fazemos o câmbio." },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime font-black text-pine">{i + 1}</span>
              <span>
                <span className="block font-extrabold text-cream">{f.t}</span>
                <span className="text-sm font-medium text-cream/65">{f.d}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="relative text-xs font-semibold text-cream/45">© 2026 MOZOUT-USD · Maputo</p>
      </div>

      {/* Formulário */}
      <div className="flex flex-col items-center justify-center bg-cream px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center lg:hidden"><Logo /></div>

          {passo === 1 ? (
            <>
              <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-forest">Cria a tua conta</h1>
              <p className="mt-1.5 font-medium text-ink/60">Dois minutos, sem papelada. Maiores de 18 anos.</p>

              <form onSubmit={submeterDados} className="mt-7 flex flex-col gap-4">
                <div>
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input id="nome" required autoComplete="name" placeholder="Maria Fernandes" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="nascimento">Data de nascimento</Label>
                  <Input id="nascimento" required type="date" max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().slice(0, 10)} value={form.nascimento} onChange={(e) => setForm({ ...form, nascimento: e.target.value })} />
                  <FieldHint>Tens de ter pelo menos 18 anos.</FieldHint>
                </div>
                <div>
                  <Label htmlFor="telefone">Número de telefone</Label>
                  <Input id="telefone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="+258 84 123 4567" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                  <FieldHint>Formato internacional — é para aqui que enviamos o código SMS.</FieldHint>
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" required type="email" autoComplete="email" placeholder="maria@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="password">Palavra-passe</Label>
                  <Input id="password" required type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  {form.password && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex h-1.5 flex-1 gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <span key={i} className={cn("h-full flex-1 rounded-full", forca.nivel >= i ? (forca.nivel >= 3 ? "bg-lime-strong" : "bg-amber-400") : "bg-mist")} />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-ink/55">{forca.texto}</span>
                    </div>
                  )}
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-mist bg-surface p-3.5">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#163c2b]" checked={form.termos} onChange={(e) => setForm({ ...form, termos: e.target.checked })} />
                  <span className="text-xs font-medium leading-relaxed text-ink/70">
                    Aceito os <a href="#" className="font-bold text-forest underline underline-offset-2">Termos de Serviço</a> e a <a href="#" className="font-bold text-forest underline underline-offset-2">Política de Privacidade</a> do MOZOUT-USD, e autorizo o tratamento dos meus dados para fins de verificação e prevenção de fraude.
                  </span>
                </label>

                <FieldError>{erro}</FieldError>
                <Button type="submit" size="lg" loading={loading} className="w-full">Criar conta <ArrowRight className="h-5 w-5" /></Button>
              </form>
              <p className="mt-5 text-center text-sm font-semibold text-ink/60">
                Já tens conta? <Link href="/entrar" className="font-extrabold text-forest underline underline-offset-4">Entrar</Link>
              </p>
            </>
          ) : (
            <>
              <button onClick={() => setPasso(1)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink/55 hover:text-ink"><ArrowLeft className="h-4 w-4" /> Voltar</button>
              <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-forest">Confirma o teu telefone</h1>
              <p className="mt-1.5 font-medium text-ink/60">
                Enviámos um código SMS de 6 dígitos para <span className="font-extrabold text-ink">{telefoneConfirmado}</span>. Expira em 5 minutos.
              </p>

              {demoCode && (
                <div className="mt-4 rounded-2xl border border-lime-strong/40 bg-lime-soft p-3 text-center">
                  <p className="text-[0.65rem] font-extrabold uppercase tracking-wider text-forest">Código de demonstração (SMS simulado)</p>
                  <p className="mt-1 font-mono text-2xl font-bold tracking-[0.4em] text-forest">{demoCode}</p>
                </div>
              )}

              <form onSubmit={verificar} className="mt-6">
                <div className="flex justify-between gap-2">
                  {codigo.map((digito, i) => (
                    <input
                      key={i}
                      ref={(el) => { caixas.current[i] = el; }}
                      value={digito}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      onChange={(e) => caixaCodigo(i, e.target.value)}
                      onKeyDown={(e) => e.key === "Backspace" && !codigo[i] && i > 0 && caixas.current[i - 1]?.focus()}
                      className="h-14 w-full rounded-2xl border-2 border-mist bg-surface text-center font-mono text-2xl font-bold text-forest focus:border-forest focus:outline-none sm:h-16"
                      aria-label={`Dígito ${i + 1}`}
                    />
                  ))}
                </div>
                <FieldError>{erro}</FieldError>
                <Button type="submit" size="lg" loading={loading} className="mt-4 w-full">
                  <CheckCircle2 className="h-5 w-5" /> Ativar a minha conta
                </Button>
                <button type="button" onClick={reenviar} disabled={reenvioEm > 0 || loading} className="mt-3 w-full text-center text-sm font-bold text-forest disabled:text-ink/40">
                  {reenvioEm > 0 ? `Reenviar código em ${reenvioEm}s` : "Reenviar código"}
                </button>
              </form>
              <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-ink/45"><ShieldCheck className="h-4 w-4" /> O teu código nunca é partilhado nem guardado em texto simples.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
