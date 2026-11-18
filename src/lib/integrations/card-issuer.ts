/**
 * Camada de emissão de cartões.
 * `MockCardIssuer` gera números válidos Luhn em ambiente de demonstração.
 * Para integrar um emissor real (ex.: Stripe Issuing, Marqeta, Dock),
 * basta implementar a mesma interface e selecionar via variável de ambiente.
 */
import crypto from "node:crypto";
import { gerarNumeroCartao, luhnValido } from "../luhn";

export interface CartaoEmitido {
  numero: string;
  validade: string; // MM/AA
  cvv: string;
  bandeira: string;
  emitidoPelo: string;
}

export interface CardIssuer {
  emitir(titular: string): Promise<CartaoEmitido>;
}

class MockCardIssuer implements CardIssuer {
  async emitir(_titular: string): Promise<CartaoEmitido> {
    const numero = gerarNumeroCartao("4539");
    if (!luhnValido(numero)) throw new Error("Falha ao gerar número de cartão válido");
    const agora = new Date();
    const validade = `${String(agora.getMonth() + 1).padStart(2, "0")}/${String((agora.getFullYear() + 3) % 100).padStart(2, "0")}`;
    return {
      numero,
      validade,
      cvv: String(crypto.randomInt(100, 1000)),
      bandeira: "VISA",
      emitidoPelo: "mock",
    };
  }
}

export function getCardIssuer(): CardIssuer {
  // if (process.env.CARD_ISSUER === 'stripe') return new StripeCardIssuer(...)
  return new MockCardIssuer();
}
