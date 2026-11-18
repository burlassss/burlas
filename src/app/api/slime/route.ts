import { NextResponse } from "next/server";
import { z } from "zod";
import { responderKB } from "@/components/slime/slime-kb";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 8;

const corpo = z.object({ mensagem: z.string().trim().min(1).max(500) });

/**
 * POST /api/slime — resposta do assistente.
 *
 * Por omissão usa a base de conhecimento local (determinística, sem rede e
 * sem inventar dados). Se `SLIME_AI_API_KEY` estiver definido, tenta um
 * endpoint compatível com OpenAI (`SLIME_AI_BASE_URL`, `SLIME_AI_MODEL`) com
 * timeout curto e cai sempre para a base local em caso de erro.
 *
 * REGRAS: a mascote nunca executa operações financeiras nem preenche
 * formulários; apenas explica e orienta.
 */
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const limite = rateLimit(`slime:${ip}`, 30, 60_000);
  if (!limite.ok) {
    return NextResponse.json(
      { resposta: "Ufa, estou um pouco cansada de tantas perguntas! Tenta de novo daqui a um bocadinho." },
      { status: 429 },
    );
  }

  let parsed: z.infer<typeof corpo>;
  try {
    parsed = corpo.parse(await req.json());
  } catch {
    return NextResponse.json({ resposta: "Não percebi a tua mensagem — escreve uma pergunta curta e eu tento ajudar." }, { status: 400 });
  }

  const apiKey = process.env.SLIME_AI_API_KEY;
  if (apiKey) {
    try {
      const base = process.env.SLIME_AI_BASE_URL ?? "https://api.openai.com/v1";
      const modelo = process.env.SLIME_AI_MODEL ?? "gpt-4o-mini";
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6000);
      const resp = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: modelo,
          temperature: 0.6,
          max_tokens: 180,
          messages: [
            {
              role: "system",
              content:
                "És a Mozinha, a mascote de gosma do MOZOUT-USD (carteira digital em dólares para Moçambique). " +
                "Responde em português de Moçambique, no máximo 55 palavras, tom amigável e direto. " +
                "NUNCA inventes taxas, limites ou valores: usa apenas que os depósitos M-Pesa/e-Mola mínimos são MT 100 (taxa 1.5%), USDT mínimo $10 (taxa 0.5%), levantamento mínimo $5 ($2.50 M-Pesa/e-Mola, $1.50 USDT), comissão do agente paga pela MOZOUT, limites diários $5 000 (depósito) e $3 000 (levantamento), e planos Assinaturas $5/$1.50 por mês, Compras Online $10/$2.50 por mês, Viagem $15 sem mensalidade. " +
                "Nunca pedes palavra-passe nem CVV. Nunca executas operações. Se não souberes, indica suporte@mozout.co.mz.",
            },
            { role: "user", content: parsed.mensagem },
          ],
        }),
      });
      clearTimeout(t);
      if (resp.ok) {
        const data = await resp.json();
        const texto = data?.choices?.[0]?.message?.content?.trim();
        if (texto) return NextResponse.json({ resposta: texto, fonte: "ia" });
      }
    } catch {
      // silêncio: cai na base local
    }
  }

  return NextResponse.json({ ...responderKB(parsed.mensagem), fonte: "kb" });
}
