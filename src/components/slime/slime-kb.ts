/**
 * Base de conhecimento da mascote MOZOUT-USD.
 *
 * REGRA DE OURO: nunca inventar números, taxas, limites ou garantias.
 * Valores aqui vêm da configuração real da plataforma (seed/admin):
 *  - depósitos: M-Pesa 1.5% · e-Mola 1.5% · USDT 0.5%   (mínimos: MT 100 / $10)
 *  - levantamentos: M-Pesa/e-Mola $2.50 · USDT $1.50    (mínimo: $5)
 *  - comissão do agente: 1.0% da MOZOUT (não pesa no cliente)
 *  - limites diários: depósito $5 000 · levantamento $3 000
 *  - planos: Assinaturas $5 (+$1.50/mês) · Compras Online $10 (+$2.50/mês) · Viagem $15 (sem mensalidade)
 * As taxas são configuráveis em /admin/taxas — a resposta diz sempre "confirma no ecrã" quando aplicável.
 */

export interface EntradaKB {
  id: string;
  titulo: string;
  termos: string[];
  resposta: string;
}

const ENTRADAS: EntradaKB[] = [
  {
    id: "deposito",
    titulo: "Depositar dinheiro",
    termos: ["deposit", "deposito", "depositar", "carreg", "mete", "ponho", "acresc", "recarga", "mpesa", "emola", "meticais", "mt", "money", "financiar"],
    resposta:
      "Para depositar: vai a Depositar, escolhes M-Pesa, e-Mola ou USDT. Com M-Pesa/e-Mola o mínimo é MT 100 e a MOZOUT liga-te a um agente verificado perto de ti — transferes o valor e ele confirma. Com USDT (TRC20) o mínimo é $10 e o crédito chega após a rede confirmar. Taxa de depósito: 1.5% (M-Pesa/e-Mola) ou 0.5% (USDT). O valor é convertido para dólares à cotação mostrada no ecrã.",
  },
  {
    id: "levantamento",
    titulo: "Levantar para M-Pesa/e-Mola",
    termos: ["levantar", "levantamento", "sacar", "saque", "retirar", "retirada", "resgatar", "cash out", "cashout", "voltar", "dinheiro de volta"],
    resposta:
      "Vai a Levantar, escolhes M-Pesa ou e-Mola e escreves o número de destino. Mínimo $5.00. A taxa fixa é $2.50 (M-Pesa/e-Mola) ou $1.50 (USDT). O valor pedido mais a taxa fica reservado e deixa de poder ser gasto até a operação fechar — se cancelares a tempo, devolvemos tudo. Um agente paga-te em meticais e tu confirmas a receção. Limite diário: $3 000.",
  },
  {
    id: "usdt",
    titulo: "Depositar com USDT",
    termos: ["usdt", "trc20", "trc-20", "cripto", "crypto", "tether", "blockchain", "rede", "confirmações"],
    resposta:
      "Com USDT TRC20 o mínimo são $10.00. No ecrã de depósito vês o endereço para onde deves enviar — o crédito só acontece depois de a rede confirmar, nunca antes. Taxa: 0.5%. Não partilhes chaves nem seed phrase — a MOZOUT nunca te pede isso. Se o envio já foi feito, garante que foi pela rede TRC20; envios por outra rede podem perder-se.",
  },
  {
    id: "taxas",
    titulo: "Taxas e cotação",
    termos: ["taxa", "taxas", "comissão", "comissao", "margem", "câmbio", "cambio", "cotação", "cotacao", "mzn", "metical", "converter", "conversão", "quanto custa", "preço", "preco", "fee"],
    resposta:
      "Depósito: 1.5% (M-Pesa/e-Mola) e 0.5% (USDT). Levantamento: $2.50 (M-Pesa/e-Mola) e $1.50 (USDT) — cobrados em dólares. A cotação USD/MZN é administrativa e já inclui uma margem (~1.5%); o valor efetivo aparece no ecrã antes de confirmares. A comissão do agente (1.0%) é paga pela MOZOUT, não sai do teu bolso. Nota: as taxas são configuráveis — confirma sempre no resumo antes de confirmar.",
  },
  {
    id: "planos",
    titulo: "Planos de cartão",
    termos: ["plano", "planos", "cartão", "cartao", "assinatura", "assinaturas", "compras online", "viagem", "mensalidade", "ativação", "ativacao", "quanto custa o cartão"],
    resposta:
      "São três: Assinaturas — $5 de ativação + $1.50/mês, ideal para streaming e ferramentas; Compras Online — $10 de ativação + $2.50/mês, o mais popular; Viagem — $15 de ativação e nunca tem mensalidade, com cobertura internacional e seguro de compra. A ativação é única e vem da tua carteira. Depois de ativares, o cartão fica disponível na mesma sessão.",
  },
  {
    id: "cvv",
    titulo: "CVV e número do cartão",
    termos: ["cvv", "cvc", "número do cartão", "numero do cartao", "validade", "código de segurança", "dados do cartão"],
    resposta:
      "O número do cartão, o CVV e a validade só são teus — o CVV muda e só aparece quando pedes para ver. Nunca partilhes estes dados por chat, telefone ou e-mail; a MOZOUT nunca te pede o CVV. No ecrã do cartão podes revelar, copiar ou congelar. Se desconfiares de algo, congela o cartão num toque.",
  },
  {
    id: "congelar",
    titulo: "Congelar e descongelar o cartão",
    termos: ["congelar", "descongelar", "bloquear cartão", "bloquear cartao", "suspender cartão", "controlo do cartão", "compra suspeita"],
    resposta:
      "No ecrã principal ou em Cartões, toca em Congelar — todas as compras são recusadas na hora. Quando quiseres, toca em Descongelar. É instantâneo e reversível. Se houve uma compra que não reconheces, congela já e abre uma disputa no ecrã do movimento — a equipa MOZOUT analisa e estorna quando aplicável.",
  },
  {
    id: "extrato",
    titulo: "Extrato e movimentos",
    termos: ["extrato", "movimentos", "histórico", "historico", "pdf", "csv", "comprovativo", "fatura", "registos", "transações", "transacoes"],
    resposta:
      "Em Extrato vês cada movimento com descrição, taxa e referência — podes filtrar por tipo e exportar em PDF ou CSV. Os valores positivos são entradas, os negativos saídas. Para cada operação tens uma referência única (ex.: DEP-…) que podes usar para pedir suporte.",
  },
  {
    id: "limites",
    titulo: "Limites diários",
    termos: ["limite", "limites", "máximo", "maximo", "mínimo", "minimo", "quanto posso", "valor máximo"],
    resposta:
      "Depósito por M-Pesa/e-Mola: mínimo MT 100, limite diário $5 000. USDT: mínimo $10. Levantamento: mínimo $5, limite diário $3 000. Limites de gasto e carga do cartão dependem do plano (ex.: Assinaturas $1 000 de gasto; Viagem $5 000). A administração pode ajustar estes valores, por isso confirma sempre no ecrã.",
  },
  {
    id: "segunda-conta",
    titulo: "Criar e confirmar conta",
    termos: ["conta", "criar conta", "regist", "cadastr", "verific", "código sms", "codigo sms", "ativar conta", "entrar", "login", "senha", "palavra-passe", "reset"],
    resposta:
      "Criar conta: preenche nome, data de nascimento (18+), telefone e e-mail. Enviamos um código SMS de 6 dígitos — sem código não há conta. A tua palavra-passe deve ter pelo menos 8 caracteres. Se não recebeste o SMS, confirma o número e toca em Reenviar. Nunca partilhes a tua palavra-passe; a MOZOUT nunca a pede.",
  },
  {
    id: "agentes",
    titulo: "Agentes e disputas",
    termos: ["agente", "agent", "vendedor", "balcão", "balcao", "disputa", "problema com agente", "agente não pagou", "agente nao pagou", "queixa", "reclamação"],
    resposta:
      "Os agentes são verificados e recebem comissão paga pela MOZOUT. Cada depósito M-Pesa/e-Mola liga-te a um agente disponível — ele tem cerca de 15 minutos para confirmar. Se algo correr mal, tens no ecrã a opção de abrir uma disputa. A equipa analisa os dados, pode suspender o agente e estorna o valor reservado quando aplicável.",
  },
  {
    id: "seguranca",
    titulo: "Segurança",
    termos: ["segurança", "seguranca", "seguro", "roubo", "fraude", "burla", "phishing", "golpe", "dados pessoais", "branqueamento", "kyc", "documento"],
    resposta:
      "Os teus dados sensíveis são cifrados (AES-256) e os movimentos ficam num ledger imutável — nada é editado. Desconfia sempre de pedidos de palavra-passe, CVV ou transferências por fora da app. Compras não reconhecidas: congela o cartão e abre disputa. Nunca te vamos pedir para transferir para 'resolver' um problema.",
  },
  {
    id: "validacao",
    titulo: "Document Number / erros no formulário",
    termos: ["document", "documento", "bi", "bilhete", "nuit", "número de documento", "validação", "validacao", "erro", "não avança", "nao avanca", "campo obrigatório", "obrigatorio", "obrigatório"],
    resposta:
      "Se um campo está a recusar-te, confere o formato esperado: telefone em formato internacional (+258 …), código SMS de 6 dígitos, valor mínimo (MT 100 / $5 / $10). Data de nascimento só com 18+; a palavra-passe com pelo menos 8 caracteres. Se o botão não faz nada, é provável que haja um campo obrigatório por preencher — a borda do campo fica assinalada.",
  },
  {
    id: "saldo",
    titulo: "Saldo e reservas",
    termos: ["saldo", "disponível", "disponivel", "reservado", "reserva", "onde está o meu dinheiro", "onde esta o meu dinheiro", "falta dinheiro"],
    resposta:
      "No painel vês o saldo disponível e o valor 'Reservado' — esse está em operações ativas (ex.: levantamento à espera de confirmação) e não pode ser gasto. Quando o agente confirma, o valor reservado sai e o levantamento fica concluído; se cancelares, volta a ficar disponível.",
  },
  {
    id: "suporte",
    titulo: "Falar com a equipa",
    termos: ["suporte", "equipa", "humano", "pessoa", "ajuda", "falar com", "contacto", "email", "reclamar", "não funciona", "nao funciona", "bug"],
    resposta:
      "Podes falar com a equipa MOZOUT pelo e-mail suporte@mozout.co.mz. Se for sobre uma operação, inclui a referência (DEP-… / LEV-…) que aparece no extrato — assim resolvemos mais depressa. Em caso de fraude ou compra não reconhecida: congela o cartão primeiro, pergunta depois.",
  },
];

const NORMALIZAR = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Pontuação: termo exato (substring) = 2 pontos por termo; termo composto conta mais. */
export function responderKB(pergunta: string): { resposta: string; id: string | null } {
  const q = NORMALIZAR(pergunta);
  let melhor: { id: string | null; resposta: string; pontos: number } = { id: null, resposta: "", pontos: 0 };

  for (const entrada of ENTRADAS) {
    let pontos = 0;
    for (const termo of entrada.termos) {
      const t = NORMALIZAR(termo);
      if (q.includes(t)) pontos += t.includes(" ") ? 3 : t.length >= 6 ? 2 : 1.5;
    }
    if (pontos > melhor.pontos) melhor = { id: entrada.id, resposta: entrada.resposta, pontos };
  }

  if (melhor.pontos >= 2) return { resposta: melhor.resposta, id: melhor.id };

  return {
    id: null,
    resposta:
      "Hmm, essa ainda não sei responder com a certeza que mereces. Posso ajudar com depósitos (M-Pesa, e-Mola, USDT), levantamentos, taxas, planos de cartão, extrato, limites e segurança — ou falar com a equipa em suporte@mozout.co.mz. Queres tentar reformular?",
  };
}

export const SUGESTOES_RAPIDAS = [
  "Como deposito?",
  "Quanto custa levantar?",
  "Quais são os planos?",
  "Congelar o cartão",
];
