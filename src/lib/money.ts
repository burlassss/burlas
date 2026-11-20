/**
 * Utilitários monetários.
 * Toda a aritmética financeira é feita em cêntimos (inteiros) para evitar
 * erros de vírgula flutuante. A base de dados guarda numeric(14,2).
 */

export type Moeda = "USD" | "MZN" | "USDT";

export function toCents(valor: number | string): number {
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export function dbToCents(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return toCents(v);
}

export function centsToDb(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}

export function addCents(...valores: number[]): number {
  return valores.reduce((acc, v) => acc + Math.round(v), 0);
}

export function mulCents(cents: number, fator: number): number {
  return Math.round(cents * fator);
}

export function pctCents(cents: number, pct: number): number {
  return Math.round((cents * pct) / 100);
}

const ptNum = (valor: number) =>
  Math.abs(valor).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoeda(cents: number, moeda: Moeda = "USD"): string {
  const valor = fromCents(cents);
  const sinal = valor < 0 ? "-" : "";
  const abs = ptNum(valor);
  if (moeda === "MZN") return `${sinal}MT ${abs}`;
  if (moeda === "USDT") return `${sinal}${abs} USDT`;
  return `${sinal}$${abs}`;
}

/** Formata um valor já em unidades (não cêntimos) */
export function formatUnits(valor: number, moeda: Moeda = "USD"): string {
  const abs = ptNum(valor);
  const sinal = valor < 0 ? "-" : "";
  if (moeda === "MZN") return `${sinal}MT ${abs}`;
  if (moeda === "USDT") return `${sinal}${abs} USDT`;
  return `${sinal}$${abs}`;
}

/**
 * Fuso horário da aplicação (Moçambique, UTC+2, sem horário de verão).
 * Tem de ser explícito em TODA a formatação de datas/horas: o servidor
 * (Vercel) corre em UTC e o dispositivo do utilizador em Africa/Maputo —
 * sem `timeZone`, o mesmo instante formata-se 2h diferente no servidor e
 * no cliente, o que quebra a hidratação do React (#441).
 */
export const FUSO = "Africa/Maputo";

export function formatDataHora(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("pt-MZ", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: FUSO });
}

export function formatDataCurta(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric", timeZone: FUSO });
}

/**
 * Tempo relativo ("há 5 min", "ontem", …).
 * ATENÇÃO: usa `Date.now()`, por isso o resultado difere entre o render do
 * servidor e a hidratação no cliente. NUNCA chamar isto no caminho de
 * renderização — usar o componente `<TempoRelativo>` (client-only), que
 * mostra a data absoluta no primeiro paint e troca para o relativo após
 * a montagem, sem mismatch de hidratação.
 */
export function tempoRelativo(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return formatDataCurta(d);
}

export function referencia(prefix: string): string {
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}-${ts}${rnd}`;
}
