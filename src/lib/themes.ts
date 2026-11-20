import type { Plan, PlanoTier, TemaPlano } from "./db/types";

/**
 * Temas da área do cliente por nível de cartão.
 * O admin supremo escolhe o nível (tier) de cada plano e pode,
 * opcionalmente, sobrescrever qualquer cor da paleta — tudo no
 * painel de gestão de planos (/admin/planos).
 */

export const TIER_ORDEM: PlanoTier[] = ["platina", "gold", "black"];

export const TIER_INFO: Record<PlanoTier, { label: string; descricao: string }> = {
  platina: { label: "Platina", descricao: "Grafite e prata sobre fundo claro — o sucessor natural do verde por defeito." },
  gold: { label: "Gold", descricao: "Marrom profundo e dourado champanhe sobre creme quente." },
  black: { label: "Black", descricao: "Tema escuro completo, minimalismo preto com acentos neutros." },
};

export const TIER_PRESETS: Record<PlanoTier, TemaPlano> = {
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
  black: {
    bg: "#0d0d0f",
    surface: "#17171a",
    ink: "#f4f4f6",
    primary: "#232329",
    primary2: "#2d2d34",
    primary3: "#050506",
    accent: "#f5f5f7",
    accentStrong: "#d4d4d8",
    accentSoft: "#26262c",
    mist: "#232328",
    sand: "#1c1c20",
  },
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function hexValido(v: unknown): v is string {
  return typeof v === "string" && HEX.test(v);
}

/** Aceita overrides parciais já saneados — devolve sempre uma paleta completa. */
export function resolverTema(tier: PlanoTier, overrides?: Partial<TemaPlano> | null): TemaPlano {
  const preset = TIER_PRESETS[tier] ?? TIER_PRESETS.platina;
  if (!overrides) return { ...preset };
  const merged = { ...preset };
  for (const [k, v] of Object.entries(overrides)) {
    if (hexValido(v) && k in merged) (merged as Record<string, string>)[k] = v;
  }
  return merged;
}

/** Tema final a partir do plano (preset do nível + overrides do admin). */
export function resolverTemaPlano(plan?: Plan | null): TemaPlano {
  if (!plan) return { ...TIER_PRESETS.platina };
  return resolverTema(plan.tier ?? "platina", plan.tema ?? null);
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

