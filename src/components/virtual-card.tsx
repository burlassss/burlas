"use client";

import { Snowflake, Nfc } from "lucide-react";
import { cn, formatCardNumber } from "@/lib/utils";

const TEXTURAS: Record<string, string> = {
  compras: "card-texture",
  assinaturas: "card-texture-purple",
  viagem: "card-texture-gold",
};

export function VirtualCard({
  numero,
  validade,
  cvv,
  titular,
  estado,
  planNome,
  tipo,
  revelado,
  className,
}: {
  numero: string; // texto (já formatado ou mascarado)
  validade: string;
  cvv?: string | null;
  titular: string;
  estado: "ativo" | "congelado" | "cancelado" | "pendente";
  planNome: string;
  tipo: string;
  revelado: boolean;
  className?: string;
}) {
  const congelado = estado === "congelado";
  const displayNumber = revelado ? formatCardNumber(numero) : `••••  ••••  ••••  ${numero.replace(/\D/g, "").slice(-4)}`;

  return (
    <div
      className={cn(
        "card-noise relative isolate aspect-[8/5] w-full max-w-[420px] select-none overflow-hidden rounded-[1.75rem] p-5 text-cream shadow-[0_2px_4px_rgb(0_0_0/0.25),0_32px_64px_-24px_rgb(18_31_22/0.6)] ring-1 ring-white/10 transition-transform duration-300 sm:p-6",
        TEXTURAS[tipo] ?? "card-texture",
        congelado && "saturate-[0.35]",
        className,
      )}
      aria-label={`Cartão virtual ${planNome} — ${congelado ? "congelado" : "ativo"}`}
    >
      {/* brilho superior */}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/12 via-transparent to-black/35" />

      {/* topo: logótipo + bandeira */}
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 64 64" className="h-7 w-7">
            <circle cx="32" cy="32" r="30" fill="#a9f44d" />
            <text x="32" y="43" fontFamily="'Manrope Variable', Arial Black, sans-serif" fontSize="34" fontWeight={900} textAnchor="middle" fill="#121f16">$</text>
          </svg>
          <span className="text-[0.8rem] font-extrabold uppercase tracking-[0.22em] text-cream/95">Mozout</span>
        </div>
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-cream/70">{planNome}</span>
      </div>

      {/* chip + contactless */}
      <div className="relative mt-4 flex items-center gap-3">
        <svg viewBox="0 0 46 34" className="h-8 w-11 drop-shadow" aria-hidden>
          <rect x="0" y="0" width="46" height="34" rx="6" fill="#e8d9a0" />
          <rect x="0" y="0" width="46" height="34" rx="6" fill="url(#goldGrad)" fillOpacity="0.55" />
          <path d="M0 11h46M0 23h46M16 0v34M30 0v34" stroke="#a9924e" strokeWidth="1.6" />
          <defs>
            <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" />
              <stop offset="0.5" stopColor="#d9c47c" />
              <stop offset="1" stopColor="#8a713a" />
            </linearGradient>
          </defs>
        </svg>
        <Nfc className="h-6 w-6 rotate-90 text-cream/85" strokeWidth={2.2} aria-hidden />
      </div>

      {/* número */}
      <p className="relative mt-4 font-mono text-[1.05rem] font-semibold tracking-[0.18em] text-cream/95 sm:text-[1.22rem]">
        {displayNumber}
      </p>

      {/* base: titular / validade / cvv / VISA */}
      <div className="relative mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.5rem] font-bold uppercase tracking-[0.2em] text-cream/55">Titular</p>
          <p className="truncate text-[0.72rem] font-bold tracking-wide text-cream/95 sm:text-[0.78rem]">{titular}</p>
        </div>
        <div className="shrink-0">
          <p className="text-[0.5rem] font-bold uppercase tracking-[0.2em] text-cream/55">Validade</p>
          <p className="text-[0.72rem] font-bold tabular-nums text-cream/95 sm:text-[0.78rem]">{validade}</p>
        </div>
        <div className="shrink-0">
          <p className="text-[0.5rem] font-bold uppercase tracking-[0.2em] text-cream/55">CVV</p>
          <p className="text-[0.72rem] font-bold tabular-nums text-cream/95 sm:text-[0.78rem]">{revelado && cvv ? cvv : "•••"}</p>
        </div>
        <span className="shrink-0 text-[1.05rem] font-black italic tracking-tight text-cream/95 sm:text-[1.2rem]">VISA</span>
      </div>

      {/* congelado overlay */}
      {congelado && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-[#0b1f33]/45 backdrop-blur-[2.5px]">
          <Snowflake className="h-8 w-8 text-sky-200" strokeWidth={1.6} aria-hidden />
          <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.28em] text-sky-100">Congelado</p>
        </div>
      )}
    </div>
  );
}
