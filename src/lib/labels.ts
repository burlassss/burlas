/** Rótulos e cores (PT) para estados e tipos do domínio — fonte única para toda a UI. */

export const TIPO_MOVIMENTO: Record<string, string> = {
  deposito: "Depósito",
  levantamento: "Levantamento",
  compra: "Compra",
  taxa: "Taxa",
  reembolso: "Reembolso",
  ajuste: "Ajuste",
  ativacao_cartao: "Ativação de cartão",
  mensalidade: "Mensalidade",
  comissao: "Comissão",
  estorno: "Estorno",
};

export const ESTADO_DEPOSITO: Record<string, { label: string; tone: "amber" | "blue" | "green" | "red" | "zinc" }> = {
  aguardando_pagamento: { label: "Aguardando pagamento", tone: "amber" },
  identificado: { label: "Pagamento identificado", tone: "blue" },
  aguardando_confirmacoes: { label: "Aguardando confirmações", tone: "blue" },
  pendente_analise: { label: "Pendente de análise", tone: "amber" },
  aprovado: { label: "Aprovado", tone: "green" },
  recusado: { label: "Recusado", tone: "red" },
  expirado: { label: "Expirado", tone: "zinc" },
  falhou: { label: "Falhou", tone: "red" },
  reembolsado: { label: "Reembolsado", tone: "zinc" },
};

export const ESTADO_LEVANTAMENTO: Record<string, { label: string; tone: "amber" | "blue" | "green" | "red" | "zinc" }> = {
  criada: { label: "Criada", tone: "amber" },
  aguardando_agente: { label: "Aguardando agente", tone: "amber" },
  atribuida: { label: "Atribuída a agente", tone: "blue" },
  em_processamento: { label: "Em processamento", tone: "blue" },
  enviada: { label: "Enviada", tone: "blue" },
  aguardando_confirmacao: { label: "Aguardando confirmação", tone: "amber" },
  concluida: { label: "Concluída", tone: "green" },
  cancelada: { label: "Cancelada", tone: "zinc" },
  em_disputa: { label: "Em disputa", tone: "red" },
};

export const ESTADO_CARTAO: Record<string, { label: string; tone: "green" | "amber" | "red" | "zinc" }> = {
  ativo: { label: "Ativo", tone: "green" },
  congelado: { label: "Congelado", tone: "amber" },
  cancelado: { label: "Cancelado", tone: "red" },
  pendente: { label: "Pendente", tone: "zinc" },
};

export const PAPEL_LABEL: Record<string, string> = {
  cliente: "Cliente",
  agente: "Agente",
  admin: "Administrador",
  superadmin: "Superadministrador",
  suporte: "Suporte",
  financeiro: "Admin. financeiro",
  gestor_agentes: "Gestor de agentes",
  auditor: "Auditor",
};

export const METODO_LABEL: Record<string, string> = {
  usdt_trc20: "USDT TRC20",
  mpesa: "M-Pesa",
  emola: "e-Mola",
};

export const ESTADO_USUARIO: Record<string, { label: string; tone: "green" | "amber" | "red" | "zinc" }> = {
  pendente: { label: "Pendente", tone: "amber" },
  ativo: { label: "Ativo", tone: "green" },
  suspenso: { label: "Suspenso", tone: "amber" },
  bloqueado: { label: "Bloqueado", tone: "red" },
};

export const ESTADO_AGENTE: Record<string, { label: string; tone: "green" | "amber" | "red" | "zinc" }> = {
  pendente: { label: "Pendente", tone: "amber" },
  ativo: { label: "Ativo", tone: "green" },
  suspenso: { label: "Suspenso", tone: "red" },
  inativo: { label: "Inativo", tone: "zinc" },
};

export const ESTADO_DISPUTA: Record<string, { label: string; tone: "amber" | "blue" | "green" | "red" }> = {
  aberta: { label: "Aberta", tone: "red" },
  em_analise: { label: "Em análise", tone: "amber" },
  resolvida: { label: "Resolvida", tone: "green" },
  recusada: { label: "Recusada", tone: "blue" },
};
