"use client";

import { useSyncExternalStore } from "react";
import { formatDataHora, tempoRelativo } from "@/lib/money";

/**
 * Tempo relativo à prova de hidratação.
 *
 * `tempoRelativo()` depende de `Date.now()`, por isso o servidor e o
 * cliente podem produzir textos diferentes no primeiro paint (React #441).
 * Este componente mostra a data/hora absoluta (determinística, com fuso
 * Africa/Maputo fixo) no render do servidor E na primeira pintura do
 * cliente — sem mismatch — e só troca para o texto relativo depois da
 * hidratação, via `useSyncExternalStore` (padrão oficial para conteúdo
 * que difere entre servidor e cliente).
 */
const subscrever = () => () => {};
const montadoNoCliente = () => true;
const montadoNoServidor = () => false;

export function TempoRelativo({ iso }: { iso: string }) {
  const montado = useSyncExternalStore(subscrever, montadoNoCliente, montadoNoServidor);
  return <>{montado ? tempoRelativo(iso) : formatDataHora(iso)}</>;
}
