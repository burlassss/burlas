"use client";

import React from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { Logo } from "./logo";
import { LinkButton } from "./ui";

/** Navegação pública da landing. */
export function PublicHeader() {
  const [aberto, setAberto] = React.useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-cream/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="MOZOUT-USD — Página inicial">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-bold text-ink/70 lg:flex" aria-label="Secções">
          <a href="#como-funciona" className="transition-colors hover:text-ink">Como funciona</a>
          <a href="#planos" className="transition-colors hover:text-ink">Planos</a>
          <a href="#agentes" className="transition-colors hover:text-ink">Rede de agentes</a>
          <a href="#faq" className="transition-colors hover:text-ink">FAQ</a>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <LinkButton href="/entrar" variant="ghost" size="sm">Entrar</LinkButton>
          <LinkButton href="/criar-conta" variant="dark" size="sm">Criar conta</LinkButton>
        </div>
        <button className="rounded-xl p-2 hover:bg-sand lg:hidden" onClick={() => setAberto((v) => !v)} aria-label={aberto ? "Fechar menu" : "Abrir menu"} aria-expanded={aberto}>
          {aberto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {aberto && (
        <div className="border-t border-black/5 bg-cream px-4 pb-6 pt-2 lg:hidden">
          <nav className="flex flex-col divide-y divide-black/5 text-[1.05rem] font-extrabold text-ink">
            <a href="#como-funciona" onClick={() => setAberto(false)} className="py-3.5">Como funciona</a>
            <a href="#planos" onClick={() => setAberto(false)} className="py-3.5">Planos</a>
            <a href="#agentes" onClick={() => setAberto(false)} className="py-3.5">Rede de agentes</a>
            <a href="#faq" onClick={() => setAberto(false)} className="py-3.5">FAQ</a>
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/criar-conta" onClick={() => setAberto(false)} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-forest text-base font-extrabold text-lime">
              Criar conta grátis <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/entrar" onClick={() => setAberto(false)} className="flex h-14 items-center justify-center rounded-2xl border-2 border-mist font-extrabold text-ink">
              Já tenho conta — Entrar
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
