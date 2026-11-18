"use client";

import React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const PERGUNTAS = [
  {
    q: "Como é que financio o meu cartão?",
    a: "Podes depositar USDT (TRC20) com crédito após confirmação na rede, ou pagar em meticais via M-Pesa e e-Mola através da nossa rede de agentes verificados. O saldo aparece em dólares na tua carteira MOZOUT.",
  },
  {
    q: "Quanto custa ter um cartão MOZOUT?",
    a: "Depende do plano: Compras Online tem uma ativação de $10 e mensalidade de $2,50; Assinaturas custa $5 de ativação e $1,50 por mês; Viagem custa $15 de ativação e nunca tem mensalidade. Sem taxas escondidas.",
  },
  {
    q: "Posso levantar o meu dinheiro de volta para M-Pesa ou e-Mola?",
    a: "Sim. Pedes o levantamento em dólares, escolhes M-Pesa ou e-Mola e o número de destino. Um agente verificado transfere os meticais, tu confirmas a receção e a operação fica concluída.",
  },
  {
    q: "O que acontece se um agente não enviar a transferência?",
    a: "Podes abrir uma disputa diretamente na app. A equipa MOZOUT analisa os dados, pode suspender o agente e estorna o valor reservado para a tua carteira quando aplicável.",
  },
  {
    q: "Os meus dólares estão seguros?",
    a: "Os teus fundos são registados num ledger imutável — cada cêntimo entra e sai com lançamento auditável. Dados sensíveis do cartão são cifrados com AES-256 e nunca são expostos por inteiro na interface.",
  },
  {
    q: "Preciso de comprovativo para os depósitos?",
    a: "Comprovativos ajudam na análise, mas nunca são prova suficiente de pagamento. O crédito só acontece após confirmação do agente e aprovação do administrador — ou da rede, no caso de cripto.",
  },
];

export function Faq() {
  const [aberta, setAberta] = React.useState<number>(0);
  return (
    <div className="mx-auto max-w-3xl divide-y divide-black/8 rounded-3xl border border-black/5 bg-surface shadow-sm">
      {PERGUNTAS.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setAberta((v) => (v === i ? -1 : i))}
            className="flex w-full items-center justify-between gap-4 px-4 py-4 min-[380px]:gap-6 min-[380px]:px-6 min-[380px]:py-5 text-left"
            aria-expanded={aberta === i}
          >
            <span className="text-[0.97rem] font-extrabold tracking-tight text-ink">{item.q}</span>
            <Plus className={cn("h-5 w-5 shrink-0 text-forest transition-transform duration-300", aberta === i && "rotate-45")} />
          </button>
          {aberta === i && <div className="px-4 pb-5 min-[380px]:px-6 text-sm font-medium leading-relaxed text-ink/70">{item.a}</div>}
        </div>
      ))}
    </div>
  );
}
