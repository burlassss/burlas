"use client";

import React from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowDownToLine, ArrowUpRight, Info } from "lucide-react";
import { formatMoeda } from "@/lib/money";
import { cn } from "@/lib/utils";

export function WalletPanel({
  saldoCents,
  reservadoCents,
  mznEquivalente,
  cotacao,
  margemPct,
}: {
  saldoCents: number;
  reservadoCents: number;
  mznEquivalente: number;
  cotacao: number;
  margemPct: number;
}) {
  const [visivel, setVisivel] = React.useState(true);

  return (
    <section
      aria-label="A tua carteira"
      className="relative overflow-hidden rounded-[1.75rem] bg-pine p-6 text-cream shadow-[0_2px_4px_rgb(0_0_0/0.2),0_28px_56px_-24px_rgb(18_31_22/0.55)] sm:p-7"
    >
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-lime/12 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-lime/8 blur-3xl" />

      <div className="relative flex items-center justify-between">
        <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-lime/85">Carteira · USD</p>
        <button
          onClick={() => setVisivel((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[0.7rem] font-bold text-cream/85 transition-colors hover:bg-white/10"
          aria-pressed={visivel}
        >
          {visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {visivel ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      <p className="relative mt-5 text-5xl font-extrabold tracking-[-0.04em] tabular-nums text-cream sm:text-6xl">
        {visivel ? formatMoeda(saldoCents, "USD") : "$ ••••••"}
      </p>
      <p className="relative mt-2 flex items-center gap-2 text-sm font-semibold text-cream/65">
        {visivel ? (
          <>≈ MT {mznEquivalente.toLocaleString("pt-MZ", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
            <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-0.5 text-[0.65rem] font-bold text-lime/90">
              cotação {cotacao.toFixed(2)} <Info className="h-3 w-3" />
            </span>
          </>
        ) : (
          "≈ MT ••••••••"
        )}
      </p>

      <div className="relative mt-5 flex flex-wrap items-center gap-3 text-xs font-bold text-cream/70">
        <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5">
          Reservado em operações: <span className="text-lime">{visivel ? formatMoeda(reservadoCents, "USD") : "$ ••••"}</span>
        </span>
        <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5">Margem do câmbio: {margemPct.toFixed(2)}%</span>
      </div>

      <div className="relative mt-6 grid grid-cols-2 gap-2.5">
        <Link
          href="/depositar"
          className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-lime px-4 py-3.5 text-sm font-extrabold text-pine transition-all hover:bg-lime-strong sm:text-base"
        >
          <ArrowDownToLine className="h-5 w-5" strokeWidth={2.4} /> Depositar
        </Link>
        <Link
          href="/levantar"
          className="flex h-13 items-center justify-center gap-2 rounded-2xl border-2 border-lime/40 bg-transparent px-4 py-3.5 text-sm font-extrabold text-lime transition-all hover:border-lime hover:bg-lime/10 sm:text-base"
        >
          <ArrowUpRight className="h-5 w-5" strokeWidth={2.4} /> Levantar
        </Link>
      </div>
    </section>
  );
}
