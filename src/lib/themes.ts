import type { Plan, PlanoTier, TemaPlano } from "./db/types";

/**
 * Temas da área do cliente por nível de cartão.
 * O admin supremo escolhe o nível (tier) de cada plano e pode,
 * opcionalmente, sobrescrever qualquer cor da paleta — tudo no
 * painel de gestão de planos (/admin/planos).
 */

export const TIER_ORDEM: PlanoTier[] = ["standard", "platina", "gold"];

export const TIER_INFO: Record<PlanoTier, { label: string; descricao: string }> = {
  standard: { label: "Standard", descricao: "O verde original da MOZOUT — tema por defeito." },
  platina: { label: "Platina", descricao: "Grafite e prata sobre fundo claro." },
  gold: { label: "Gold", descricao: "Marrom profundo e dourado champanhe sobre creme quente." },
};

const TEXTURAS_TIPO: Record<string, string> = {
  compras: "card-texture",
  assinaturas: "card-texture-purple",
  viagem: "card-texture-gold",
};
const TEXTURAS_TIER: Record<PlanoTier, string> = {
  standard: "card-texture",
  platina: "card-texture-platinum",
  gold: "card-texture-gold",
};

/** Textura do cartão (frente e verso) — o nível manda; sem nível, cai no tipo. */
export function texturaCartao(tier?: PlanoTier | null, tipo?: string | null): string {
  if (tier) return TEXTURAS_TIER[tier] ?? "card-texture";
  return TEXTURAS_TIPO[tipo ?? ""] ?? "card-texture";
}

export const TIER_PRESETS: Record<PlanoTier, TemaPlano> = {
  // Verde original da MOZOUT (valores do @theme de globals.css)
  standard: {
    bg: "#f6f6f2",
    surface: "#ffffff",
    ink: "#121f16",
    primary: "#163c2b",
    primary2: "#1e4d38",
    primary3: "#0f2a1d",
    accent: "#a9f44d",
    accentStrong: "#8fe32f",
    accentSoft: "#e9ffd9",
    mist: "#e9eae4",
    sand: "#efefe9",
  },
  platina: {
    bg: "#f4f4f6",
    surface: "#ffffff",
    ink: "#16171b",
    primary: "#23272f",
    primary2: "#2e333c",
    primary3: "#10131a",
    accent: "#cdd1d9",
    accentStrong: "#a9aeba",
    accentSoft: "#e9eaee",
    mist: "#e2e3e8",
    sand: "#ebebee",
  },
  gold: {
    bg: "#f8f4e9",
    surface: "#fffdf6",
    ink: "#241a08",
    primary: "#2e2410",
    primary2: "#3b2f16",
    primary3: "#1a130a",
    accent: "#f2c14e",
    accentStrong: "#d9a52e",
    accentSoft: "#f9edcd",
    mist: "#e9e2cf",
    sand: "#f1ecdd",
  },
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function hexValido(v: unknown): v is string {
  return typeof v === "string" && HEX.test(v);
}

/** Aceita overrides parciais já saneados — devolve sempre uma paleta completa. */
export function resolverTema(tier: PlanoTier, overrides?: Partial<TemaPlano> | null): TemaPlano {
  const preset = TIER_PRESETS[tier] ?? TIER_PRESETS.standard;
  if (!overrides) return { ...preset };
  const merged = { ...preset };
  for (const [k, v] of Object.entries(overrides)) {
    if (hexValido(v) && k in merged) (merged as Record<string, string>)[k] = v;
  }
  return merged;
}

/** Tema final a partir do plano (preset do nível + overrides do admin). */
export function resolverTemaPlano(plan?: Plan | null): TemaPlano {
  if (!plan) return { ...TIER_PRESETS.standard };
  return resolverTema(plan.tier ?? "standard", plan.tema ?? null);
}

/**
 * Mapeia a paleta para as variáveis CSS que o Tailwind consome
 * (ver @theme em globals.css — os utilitários usam var(--color-*)).
 * Aplicadas inline no contentor da área do cliente, com escopo local.
 */
export function temaParaCssVars(t: TemaPlano): Record<string, string> {
  return {
    "--color-cream": t.bg,
    "--color-surface": t.surface,
    "--color-ink": t.ink,
    "--color-forest": t.primary,
    "--color-moss": t.primary2,
    "--color-pine": t.primary3,
    "--color-lime": t.accent,
    "--color-lime-strong": t.accentStrong,
    "--color-lime-soft": t.accentSoft,
    "--color-mist": t.mist,
    "--color-sand": t.sand,
  };
}

