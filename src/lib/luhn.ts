/** Utilitários de validação de números de cartão (Luhn). */

export function luhnValido(numero: string): boolean {
  const digits = numero.replace(/\D/g, "");
  if (digits.length < 12) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Encontra o dígito de controlo que faz `prefixo` passar no Luhn. */
export function luhnCheckDigit(prefixo: string): number {
  for (let d = 0; d <= 9; d++) {
    if (luhnValido(prefixo + String(d))) return d;
  }
  return 0;
}

/** Gera um número de cartão de 16 dígitos válido segundo Luhn, com o prefixo dado. */
export function gerarNumeroCartao(prefixo = "4539"): string {
  let numero = prefixo;
  while (numero.length < 15) {
    numero += Math.floor(Math.random() * 10).toString();
  }
  return numero + luhnCheckDigit(numero).toString();
}
