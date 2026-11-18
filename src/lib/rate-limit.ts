/** Rate limiter em memória (janela deslizante). Adequado a instância única; para multi-instância usar Redis/Upstash. */

const janelas = new Map<string, number[]>();

export function rateLimit(chave: string, limite: number, janelaMs: number): { ok: boolean; restante: number; retryAfterSeg: number } {
  const agora = Date.now();
  const desde = agora - janelaMs;
  const lista = (janelas.get(chave) ?? []).filter((t) => t > desde);
  if (lista.length >= limite) {
    const retryAfterSeg = Math.ceil((lista[0] + janelaMs - agora) / 1000);
    janelas.set(chave, lista);
    return { ok: false, restante: 0, retryAfterSeg };
  }
  lista.push(agora);
  janelas.set(chave, lista);
  return { ok: true, restante: limite - lista.length, retryAfterSeg: 0 };
}
