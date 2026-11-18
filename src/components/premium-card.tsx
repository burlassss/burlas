"use client";

import React from "react";
import { Snowflake, Nfc, Wifi } from "lucide-react";
import { cn, formatCardNumber } from "@/lib/utils";

const TEXTURAS: Record<string, string> = {
  compras: "card-texture",
  assinaturas: "card-texture-purple",
  viagem: "card-texture-gold",
};

/**
 * Cartão premium com rotação 3D.
 *  · Inclina-se com o ponteiro (desktop) e flutua suavemente em repouso
 *  · Toque/clique vira o cartão (frente ↔ verso com CVV)
 *  · Revelação de número/CVV controlada pelo componente pai
 */
export function PremiumCard({
  numero, // null = mascarado (mostra 1º e último grupo)
  ultimos4,
  validade,
  cvv, // null = ••• no verso
  titular,
  estado,
  planNome,
  tipo,
  revelado,
  className,
}: {
  numero: string | null;
  ultimos4: string;
  validade: string;
  cvv: string | null;
  titular: string;
  estado: "ativo" | "congelado" | "cancelado" | "pendente";
  planNome: string;
  tipo: string;
  revelado: boolean;
  className?: string;
}) {
  const congelado = estado === "congelado";
  const [flipped, setFlipped] = React.useState(false);
  const [tilt, setTilt] = React.useState<{ x: number; y: number } | null>(null);
  const [glare, setGlare] = React.useState({ x: 50, y: 30 });
  const areaRef = React.useRef<HTMLDivElement>(null);

  const displayNumber = revelado && numero
    ? formatCardNumber(numero)
    : `4539  ••••  ••••  ${ultimos4}`;

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = areaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (py - 0.5) * -16, y: (px - 0.5) * 20 });
    setGlare({ x: px * 100, y: py * 100 });
  }

  function onPointerLeave() {
    setTilt(null);
  }

  const tiltStyle: React.CSSProperties = tilt
    ? { transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transition: "transform 0.08s linear" }
    : {};

  return (
    <div ref={areaRef} className={cn("persp-1200 w-full max-w-[440px] select-none", className)} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div className={cn("preserve-3d aspect-[8/5] w-full", !tilt && "animate-card-idle")} style={tiltStyle}>
        {/* ── Frente / verso (eixo de flip) ── */}
        <div
          className="preserve-3d relative h-full w-full transition-transform duration-500 [transition-timing-function:cubic-bezier(0.34,1.4,0.44,1)]"
          style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
          role="button"
          tabIndex={0}
          aria-label={`Cartão ${planNome}. Toca para ${flipped ? "ver a frente" : "ver o verso"}.`}
          onClick={() => setFlipped((v) => !v)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped((v) => !v); } }}
        >
          {/* ═══════════ FRENTE ═══════════ */}
          <div className={cn("backface-hidden card-noise absolute inset-0 overflow-hidden rounded-[1.6rem] text-cream ring-1 ring-white/15 shadow-[0_2px_6px_rgb(0_0_0/0.3),0_36px_64px_-28px_rgb(18_31_22/0.65)]", TEXTURAS[tipo] ?? "card-texture", congelado && "saturate-[0.4]")}>
            {/* brilho exterior */}
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-lime/15 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
            {/* brilho que segue o ponteiro */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-70 mix-blend-overlay"
              style={{ background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.5), transparent 46%)` }}
            />
            {/* faixa de luz a varrer */}
            <div aria-hidden className="pointer-events-none absolute inset-y-0 w-28 animate-shine bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="relative flex h-full flex-col justify-between p-4 sm:p-5">
              {/* topo */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 64 64" className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden>
                    <circle cx="32" cy="32" r="31" fill="#a9f44d" />
                    <circle cx="32" cy="32" r="23.5" fill="none" stroke="#121f16" strokeWidth="2.4" strokeOpacity="0.28" />
                    <text x="32" y="42.5" fontFamily="'Manrope Variable', Arial Black, sans-serif" fontSize="30" fontWeight={900} textAnchor="middle" fill="#121f16">$</text>
                  </svg>
                  <span className="text-[0.78rem] font-black uppercase tracking-[0.24em] text-cream/95 sm:text-[0.85rem]">Mozout</span>
                </div>
                <span className="rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[0.55rem] font-extrabold uppercase tracking-[0.18em] text-cream/85 sm:text-[0.6rem]">{planNome}</span>
              </div>

              {/* chip + NFC */}
              <div className="flex items-center gap-2.5">
                <svg viewBox="0 0 46 34" className="h-7 w-10 drop-shadow-md sm:h-8 sm:w-11" aria-hidden>
                  <rect x="0" y="0" width="46" height="34" rx="6" fill="#e8d9a0" />
                  <rect x="0" y="0" width="46" height="34" rx="6" fill="url(#mc-gold)" fillOpacity="0.6" />
                  <path d="M0 11h46M0 23h46M16 0v34M30 0v34" stroke="#a9924e" strokeWidth="1.5" />
                  <defs>
                    <linearGradient id="mc-gold" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#fff" /><stop offset="0.5" stopColor="#d9c47c" /><stop offset="1" stopColor="#8a713a" />
                    </linearGradient>
                  </defs>
                </svg>
                <Nfc className="h-5 w-5 rotate-90 text-cream/85 sm:h-6 sm:w-6" strokeWidth={2.1} aria-hidden />
              </div>

              {/* número */}
              <p
                className="font-mono text-[1.02rem] font-semibold tracking-[0.16em] text-cream drop-shadow-sm sm:text-[1.3rem] sm:tracking-[0.18em]"
                style={{ textShadow: "0 2px 3px rgb(0 0 0 / 0.45)" }}
              >
                {displayNumber}
              </p>

              {/* base */}
              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[0.42rem] font-bold uppercase tracking-[0.22em] text-cream/55 sm:text-[0.5rem]">Titular do cartão</p>
                  <p className="truncate text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-cream/95 sm:text-[0.8rem]">{titular}</p>
                </div>
                <div className="shrink-0">
                  <p className="text-[0.42rem] font-bold uppercase tracking-[0.22em] text-cream/55 sm:text-[0.5rem]">Validade</p>
                  <p className="text-[0.68rem] font-extrabold tabular-nums text-cream/95 sm:text-[0.8rem]">{validade}</p>
                </div>
                <span className="shrink-0 pb-0.5 text-base font-black italic leading-none tracking-tight text-cream drop-shadow sm:text-[1.35rem]">VISA</span>
              </div>
            </div>

            {/* overlay congelado */}
            {congelado && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-[#0b1f33]/50 backdrop-blur-[2px]">
                <Snowflake className="h-8 w-8 text-sky-200 sm:h-10 sm:w-10" strokeWidth={1.5} aria-hidden />
                <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.3em] text-sky-100 sm:text-[0.72rem]">Congelado</p>
              </div>
            )}
          </div>

          {/* ═══════════ VERSO ═══════════ */}
          <div className={cn("backface-hidden rotate-y-180 absolute inset-0 overflow-hidden rounded-[1.6rem] text-cream ring-1 ring-white/15 shadow-[0_2px_6px_rgb(0_0_0/0.3),0_36px_64px_-28px_rgb(18_31_22/0.65)]", TEXTURAS[tipo] ?? "card-texture", congelado && "saturate-[0.4]")}>
            <div aria-hidden className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full bg-lime/10 blur-3xl" />
            {/* tarja magnética */}
            <div className="relative mt-6 h-10 w-full bg-[#0a0a0a] sm:mt-7 sm:h-12" />
            {/* assinatura + CVV */}
            <div className="relative px-5 pt-4 sm:px-6">
              <p className="text-[0.42rem] font-bold uppercase tracking-[0.22em] text-cream/55 sm:text-[0.5rem]">Assinatura autorizada · CVV</p>
              <div className="mt-1.5 flex h-9 items-stretch overflow-hidden rounded-md sm:h-10">
                <div className="signature-lines flex-1 bg-[#f1efe4]" style={{ backgroundImage: "repeating-linear-gradient(-12deg, transparent 0 5px, rgb(0 0 0 / 0.09) 5px 6px)" }} />
                <div className="flex w-20 shrink-0 items-center justify-center bg-[#e9ffd9] sm:w-24">
                  <span className="font-mono text-sm font-black italic tracking-[0.2em] text-[#121f16] sm:text-base">{revelado && cvv ? cvv : "•••"}</span>
                </div>
              </div>
            </div>
            {/* notas + rede */}
            <div className="relative flex items-end justify-between gap-3 px-5 pt-3 sm:px-6">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5 text-lime/80" strokeWidth={2.4} aria-hidden />
                  <p className="text-[0.5rem] font-extrabold uppercase tracking-[0.2em] text-cream/60">Cartão virtual · uso online</p>
                </div>
                <p className="mt-1 text-[0.52rem] font-semibold leading-snug text-cream/45 sm:text-[0.58rem]">
                  Emitido por MOZOUT-USD · Emissor licenciado. CVV válido para compras online. Nunca partilhes estes dados.
                </p>
              </div>
              <span className="shrink-0 pb-0.5 text-sm font-black italic text-cream/85 sm:text-lg">VISA</span>
            </div>
            {congelado && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-[#0b1f33]/50 backdrop-blur-[2px]">
                <Snowflake className="h-8 w-8 text-sky-200 sm:h-10 sm:w-10" strokeWidth={1.5} aria-hidden />
                <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.3em] text-sky-100">Congelado</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[0.58rem] font-bold uppercase tracking-[0.2em] text-forest/60">Toca no cartão para virar</p>
    </div>
  );
}
