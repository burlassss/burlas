import Link from "next/link";
import {
  ArrowRight, ShieldCheck, Globe2, Wallet, Snowflake, Receipt, BadgeCheck,
  Smartphone, CircleDollarSign, Zap, Plane, ShoppingBag, Repeat2, Check,
} from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { Logo } from "@/components/logo";
import { Faq } from "@/components/faq";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const MARCAS = ["Netflix", "Amazon", "Spotify", "OpenAI", "AliExpress", "Google Ads", "Booking.com", "Uber", "Temu", "Shein", "Apple", "Adobe"];

const ICONE_PLANO: Record<string, React.ElementType> = {
  shopping: ShoppingBag,
  repeat: Repeat2,
  plane: Plane,
};

export default async function LandingPage() {
  const planos = (await db.listPlans()).filter((p) => p.ativo);

  return (
    <div className="min-h-dvh bg-cream text-ink">
      <PublicHeader />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 hidden h-[34rem] w-[34rem] rounded-full bg-lime/30 blur-3xl sm:block" />
        <div aria-hidden className="pointer-events-none absolute -left-48 top-64 hidden h-80 w-80 rounded-full bg-forest/10 blur-3xl sm:block" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-3 pb-12 pt-7 min-[380px]:px-4 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:pb-24 lg:pt-16">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-forest/15 bg-lime-soft px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-forest">
              <span className="h-2 w-2 animate-pulse rounded-full bg-lime-strong" />
              Agora em Moçambique
            </span>

            <h1 className="mt-5 text-[2.28rem] min-[380px]:text-[2.55rem] font-extrabold leading-[1.02] tracking-[-0.04em] text-forest sm:text-6xl lg:text-[4.4rem]">
              O teu dinheiro,
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">sem fronteiras.</span>
                <span aria-hidden className="absolute inset-x-[-0.1em] bottom-[0.06em] z-0 h-[0.33em] -rotate-1 rounded-sm bg-lime/70" />
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-base min-[380px]:text-lg font-medium leading-snug text-ink/75">
              Carteira digital em dólares, cartão virtual internacional e depósitos por M-Pesa, e-Mola ou USDT.
              Feito em Moçambique, pensado para o mundo.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/criar-conta" className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-forest px-8 text-base font-extrabold text-lime transition-transform hover:-translate-y-0.5">
                Criar a minha conta — é grátis
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#como-funciona" className="inline-flex h-14 items-center justify-center rounded-full px-6 text-base font-extrabold text-forest underline underline-offset-4 hover:text-moss">
                Ver como funciona
              </a>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-bold text-ink/60">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-forest" /> Dados cifrados AES-256</span>
              <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-forest" /> Ledger imutável e auditável</span>
              <span className="inline-flex items-center gap-1.5"><Zap className="h-4 w-4 text-forest" /> Cartão ativo na mesma sessão</span>
            </div>
          </div>

          {/* Visual composto: cartão + carteira */}
          <div className="relative lg:col-span-5">
            <div className="relative mx-auto w-full max-w-md">
              <div className="animate-float relative z-10 rotate-0 sm:rotate-[-4deg] rounded-[1.75rem] transition-transform duration-500 hover:rotate-0">
                <div className="card-noise card-texture relative overflow-hidden rounded-[1.5rem] min-[380px]:rounded-[1.75rem] p-4 min-[380px]:p-6 text-cream shadow-[0_2px_4px_rgb(0_0_0/0.25),0_40px_70px_-24px_rgb(18_31_22/0.55)] ring-1 ring-white/10">
                  <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/12 via-transparent to-black/35" />
                  <div className="relative flex items-center justify-between">
                    <svg viewBox="0 0 64 64" className="h-7 w-7"><circle cx="32" cy="32" r="30" fill="#a9f44d"/><text x="32" y="43" fontFamily="Arial Black, sans-serif" fontSize="34" fontWeight={900} textAnchor="middle" fill="#121f16">$</text></svg>
                    <span className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-cream/70">Virtual</span>
                  </div>
                  <p className="relative mt-7 font-mono [font-size:clamp(0.78rem,5.1vw,1.3rem)] font-semibold tracking-[0.14em] min-[380px]:tracking-[0.2em] text-cream/95">4539&nbsp;&nbsp;••••&nbsp;&nbsp;••••&nbsp;&nbsp;2071</p>
                  <div className="relative mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-[0.5rem] font-bold uppercase tracking-[0.25em] text-cream/55">Titular</p>
                      <p className="text-sm font-bold tracking-wide">O TEU NOME</p>
                    </div>
                    <p className="text-lg font-black italic tracking-tight">VISA</p>
                  </div>
                </div>
              </div>

              {/* Chip de saldo */}
              <div className="absolute -left-1 top-2 z-20 hidden min-[380px]:block sm:-left-10 rounded-2xl border border-black/5 bg-surface/95 px-4 py-2.5 shadow-lg backdrop-blur sm:-left-10">
                <p className="text-[0.6rem] font-extrabold uppercase tracking-wider text-ink/50">Saldo disponível</p>
                <p className="text-xl font-extrabold tracking-tight text-forest">$1,127.49</p>
                <p className="text-[0.62rem] font-bold text-ink/50">≈ MT 71 962 · cotação 63,80</p>
              </div>

              {/* Chip e-Mola/M-Pesa */}
              <div className="absolute -right-1 bottom-24 z-20 hidden items-center gap-2 sm:flex rounded-2xl border border-black/5 bg-surface/95 px-4 py-2.5 shadow-lg backdrop-blur sm:-right-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e60000]/10 text-[#e60000]"><Smartphone className="h-5 w-5" /></span>
                <span>
                  <span className="block text-[0.68rem] font-extrabold text-ink">M-Pesa · e-Mola</span>
                  <span className="block text-[0.62rem] font-bold text-ink/55">depósitos em minutos</span>
                </span>
              </div>

              {/* Chip USDT */}
              <div className="absolute bottom-2 left-4 z-20 hidden items-center gap-2 min-[380px]:flex rounded-2xl bg-pine px-4 py-2.5 text-lime shadow-lg">
                <CircleDollarSign className="h-5 w-5" />
                <span className="text-[0.68rem] font-extrabold">USDT TRC20</span>
              </div>
            </div>
          </div>
        </div>

        {/* marquee de marcas */}
        <div className="border-y border-black/5 bg-forest py-3 text-cream">
          <div className="overflow-hidden">
            <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap">
              {[...MARCAS, ...MARCAS].map((marca, i) => (
                <span key={i} className="text-sm font-extrabold uppercase tracking-[0.18em] text-cream/70">{marca}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ────────────────────────────────────── */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-forest/70">Como funciona</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-extrabold leading-[1.05] tracking-[-0.03em] text-forest sm:text-5xl">
          Da carteira móvel ao mundo, em três passos.
        </h2>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { n: "1", t: "Cria a tua conta", d: "Registo com nome, telefone e e-mail. Verificamos o teu número por SMS — sem papelada, sem filas.", icon: BadgeCheck },
            { n: "2", t: "Deposita como preferires", d: "USDT TRC20 com confirmação automática, ou M-Pesa / e-Mola via agentes verificados perto de ti.", icon: Wallet },
            { n: "3", t: "Paga em qualquer lugar", d: "O teu cartão virtual é aceite em milhões de lojas online. Congelar? Um toque. CVV? Só tu vês.", icon: Globe2 },
          ].map((passo) => (
            <div key={passo.n} className="group rounded-3xl border border-black/5 bg-surface p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest text-lg font-black text-lime">{passo.n}</div>
              <h3 className="mt-4 text-xl font-extrabold tracking-tight text-ink">{passo.t}</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink/65">{passo.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FUNCIONALIDADES ─────────────────────────────────── */}
      <section className="border-t border-black/5 bg-sand/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-forest/70">Pensado ao detalhe</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-extrabold leading-[1.05] tracking-[-0.03em] text-forest sm:text-5xl">Controlo total, zero surpresas.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Snowflake, t: "Congelar e descongelar", d: "Suspeita de algo? Congela o cartão num toque e descongela quando quiseres." },
              { icon: Receipt, t: "Extrato sempre disponível", d: "Cada movimento com descrição, taxa e referência. Exporta PDF ou CSV." },
              { icon: ShieldCheck, t: "Ledger imutável", d: "Nenhum saldo é editado — tudo nasce, cresce e termina no lançamento contabilístico." },
              { icon: CircleDollarSign, t: "Dólares, sempre", d: "USD como moeda da carteira. Protege-te da desvalorização do metical." },
            ].map((f) => (
              <div key={f.t} className="rounded-3xl border border-black/5 bg-surface p-6">
                <f.icon className="h-7 w-7 text-forest" strokeWidth={1.8} />
                <h3 className="mt-3 font-extrabold tracking-tight text-ink">{f.t}</h3>
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-ink/65">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANOS ──────────────────────────────────────────── */}
      <section id="planos" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-forest/70">Planos de cartão</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-extrabold leading-[1.05] tracking-[-0.03em] text-forest sm:text-5xl">Escolhe o teu cartão.</h2>
        <p className="mt-3 max-w-lg font-medium text-ink/65">Ativação única, sem letras pequenas. Limites generosos e CVV sempre visível só para ti.</p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {planos.map((plano) => {
            const Icone = ICONE_PLANO[plano.icone] ?? ShoppingBag;
            return (
              <div
                key={plano.id}
                className={`relative flex flex-col rounded-3xl border p-6 transition-transform hover:-translate-y-1 ${
                  plano.destaque ? "border-forest bg-forest text-cream shadow-[0_28px_60px_-24px_rgb(22_60_43/0.5)]" : "border-black/5 bg-surface"
                }`}
              >
                {plano.destaque && (
                  <span className="absolute -top-3 right-6 rounded-full bg-lime px-3 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-pine shadow">Mais popular</span>
                )}
                <Icone className={`h-8 w-8 ${plano.destaque ? "text-lime" : "text-forest"}`} strokeWidth={1.7} />
                <h3 className="mt-3 text-2xl font-extrabold tracking-tight">{plano.nome}</h3>
                <p className={`mt-1.5 text-sm font-medium leading-snug ${plano.destaque ? "text-cream/80" : "text-ink/60"}`}>{plano.descricao}</p>
                <div className="mt-5 flex items-end gap-2">
                  <span className="text-4xl font-extrabold tracking-tight">${plano.taxa_ativacao_usd}</span>
                  <span className={`pb-1.5 text-xs font-bold uppercase tracking-wider ${plano.destaque ? "text-cream/60" : "text-ink/50"}`}>
                    ativação{plano.mensalidade_usd > 0 ? ` · $${plano.mensalidade_usd}/mês` : " · sem mensalidade"}
                  </span>
                </div>
                <ul className="mt-5 flex flex-col gap-2 text-sm font-semibold">
                  {(Array.isArray(plano.beneficios) ? plano.beneficios : []).slice(0, 4).map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plano.destaque ? "text-lime" : "text-forest"}`} strokeWidth={3} />
                      <span className={plano.destaque ? "text-cream/90" : "text-ink/80"}>{String(b)}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/criar-conta"
                  className={`mt-6 inline-flex h-12 items-center justify-center rounded-full font-extrabold transition-all ${
                    plano.destaque ? "bg-lime text-pine hover:bg-lime-strong" : "border-2 border-forest text-forest hover:bg-forest hover:text-lime"
                  }`}
                >
                  Quero este cartão
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── AGENTES ─────────────────────────────────────────── */}
      <section id="agentes" className="border-t border-black/5 bg-pine text-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-lime/80">Rede de agentes MOZOUT</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-[1.05] tracking-[-0.03em] text-lime sm:text-5xl">
              O M-Pesa e o e-Mola, finalmente ligados ao mundo.
            </h2>
            <p className="mt-4 max-w-lg font-medium leading-relaxed text-cream/75">
              A nossa rede de agentes verificados recebe os teus meticais e credita dólares na tua carteira.
              Distribuição automática, reputação medida a cada operação e disputas resolvidas pela equipa MOZOUT.
            </p>
            <ul className="mt-6 grid gap-3 text-sm font-semibold text-cream/85 sm:grid-cols-2">
              {["Agentes verificados e avaliados", "Distribuição por desempenho e capacidade", "Comissão e limite diário transparentes", "Disputas arbitradas pela equipa"].map((t) => (
                <li key={t} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-lime" strokeWidth={3} />{t}</li>
              ))}
            </ul>
            <Link href="/criar-conta" className="mt-7 inline-flex h-13 items-center gap-2 rounded-full bg-lime px-7 py-4 font-extrabold text-pine hover:bg-lime-strong">
              Depositar agora <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-lime/80">Exemplo real</p>
              <div className="mt-3 rounded-2xl bg-cream p-4 text-ink">
                <p className="text-[0.65rem] font-extrabold uppercase tracking-wider text-ink/50">Transferência para</p>
                <p className="mt-0.5 font-extrabold">Celso Mondlane · M-Pesa</p>
                <p className="text-sm font-semibold text-ink/60">+258 84 246 8135 · Maputo — Baixa</p>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-sand p-3 text-sm font-bold">
                  <span>Envias</span>
                  <span>MT 32 000,00</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between rounded-xl bg-lime-soft p-3 text-sm font-extrabold text-forest">
                  <span>Recebes</span>
                  <span>$492,50</span>
                </div>
                <p className="mt-2 text-center text-[0.62rem] font-bold text-ink/45">Cotação 63,80 · margem já aplicada · ref. DEP-M2411XK9</p>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs font-bold text-cream/60">
                <span>★ 4,8 · 1 243 operações</span>
                <span>Resposta média: 4 min</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-forest/70">Perguntas frequentes</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.03em] text-forest sm:text-4xl">Tudo sobre o MOZOUT-USD</h2>
        <div className="mt-8"><Faq /></div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-forest px-6 py-14 text-center text-cream sm:px-12">
          <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-lime/20 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-lime/10 blur-3xl" />
          <h2 className="relative mx-auto max-w-2xl text-3xl font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
            O mundo não espera pelo teu cartão. <span className="text-lime">Nem devia.</span>
          </h2>
          <p className="relative mx-auto mt-4 max-w-md font-medium text-cream/75">Abre a tua conta em menos de dois minutos e recebe o cartão na mesma sessão.</p>
          <Link href="/criar-conta" className="relative mt-7 inline-flex h-14 items-center gap-2 rounded-full bg-lime px-9 text-base font-extrabold text-pine transition-transform hover:-translate-y-0.5 hover:bg-lime-strong">
            Criar a minha conta <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-black/5 bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
            <div>
              <Logo />
              <p className="mt-3 max-w-xs text-sm font-medium text-ink/60">A carteira digital em dólares feita para Moçambique. Paga ao mundo, recebe do mundo.</p>
            </div>
            <div className="grid grid-cols-2 gap-10 text-sm font-semibold sm:grid-cols-3">
              <div>
                <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-ink/45">Produto</p>
                <ul className="mt-2 space-y-1.5"><li><a href="#planos" className="hover:text-forest">Cartões</a></li><li><a href="#agentes" className="hover:text-forest">Rede de agentes</a></li><li><a href="#como-funciona" className="hover:text-forest">Como funciona</a></li></ul>
              </div>
              <div>
                <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-ink/45">Empresa</p>
                <ul className="mt-2 space-y-1.5"><li><a href="#faq" className="hover:text-forest">FAQ</a></li><li><a href="mailto:suporte@mozout.co.mz" className="hover:text-forest">Suporte</a></li><li><Link href="/criar-conta" className="hover:text-forest">Criar conta</Link></li></ul>
              </div>
              <div>
                <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-ink/45">Legal</p>
                <ul className="mt-2 space-y-1.5"><li><a href="#" className="hover:text-forest">Termos de Serviço</a></li><li><a href="#" className="hover:text-forest">Política de Privacidade</a></li><li><a href="#" className="hover:text-forest">Prevenção de branqueamento</a></li></ul>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-black/5 pt-6 text-xs font-semibold text-ink/45 sm:flex-row sm:items-center">
            <p>© 2026 MOZOUT-USD, S.A. · Maputo, Moçambique</p>
            <p>Licenciado pelo Banco de Moçambique · PCI-DSS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
