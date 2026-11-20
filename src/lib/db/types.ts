/** Tipos de dados partilhados pela camada de acesso a dados. */

export type Papel =
  | "cliente"
  | "agente"
  | "admin"
  | "superadmin"
  | "suporte"
  | "financeiro"
  | "gestor_agentes"
  | "auditor";

export type UsuarioEstado = "pendente" | "ativo" | "suspenso" | "bloqueado";

export interface User {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  nascimento: string;
  password_hash: string;
  estado: UsuarioEstado;
  telefone_verificado: boolean;
  papel: Papel;
  criado_em: string;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  expira_em: string;
  criado_em: string;
  ip: string | null;
  user_agent: string | null;
}

export interface SmsCode {
  id: string;
  telefone: string;
  codigo_hash: string;
  proposito: string;
  tentativas: number;
  expira_em: string;
  criado_em: string;
  verificado_em: string | null;
}

export type PlanTipo = "compras" | "assinaturas" | "viagem";

/** Nível premium do cartão — controla o tema da área do cliente. */
export type PlanoTier = "standard" | "platina" | "gold";

/** Paleta completa do tema (10 cores). Todos os campos em hex #rrggbb. */
export interface TemaPlano {
  bg: string;
  surface: string;
  ink: string;
  primary: string;
  primary2: string;
  primary3: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  mist: string;
  sand: string;
}

export interface Plan {
  id: string;
  nome: string;
  slug: string;
  tipo: PlanTipo;
  descricao: string;
  imagem: string | null;
  moedas: string[];
  taxa_ativacao_usd: number;
  mensalidade_usd: number;
  limite_gasto_usd: number;
  limite_carga_usd: number;
  validade_meses: number;
  ordem: number;
  ativo: boolean;
  destaque: boolean;
  cor: string;
  icone: string;
  beneficios: string[];
  /** Nível premium — define o tema base da área do cliente. */
  tier: PlanoTier;
  /** Overrides parciais/completos da paleta por defeito do nível. null = preset. */
  tema: TemaPlano | null;
  criado_em: string;
}

export type CardEstado = "ativo" | "congelado" | "cancelado" | "pendente";

export interface Card {
  id: string;
  user_id: string;
  plan_id: string;
  numero: string; // encriptado em repouso
  validade: string; // MM/AA
  cvv: string; // encriptado em repouso
  titular: string;
  estado: CardEstado;
  limite_mensal: number;
  criado_em: string;
}

export type LedgerTipo =
  | "deposito"
  | "levantamento"
  | "compra"
  | "taxa"
  | "reembolso"
  | "ajuste"
  | "ativacao_cartao"
  | "mensalidade"
  | "comissao"
  | "estorno";

export interface LedgerEntry {
  id: string;
  user_id: string;
  tipo: LedgerTipo;
  valor: number; // assinado, em unidades da moeda
  moeda: string;
  rate_id: string | null;
  referencia: string;
  estado: "pendente" | "confirmado" | "estornado";
  descricao: string;
  saldo_resultante: number;
  criado_em: string;
}

export interface Reservation {
  id: string;
  user_id: string;
  valor_usd: number;
  referencia: string;
  estado: "ativa" | "consumida" | "cancelada";
  criado_em: string;
}

export type DepositoMetodo = "usdt_trc20" | "mpesa" | "emola";
export type DepositoEstado =
  | "aguardando_pagamento"
  | "identificado"
  | "aguardando_confirmacoes"
  | "pendente_analise"
  | "aprovado"
  | "recusado"
  | "expirado"
  | "falhou"
  | "reembolsado";

export interface Deposit {
  id: string;
  user_id: string;
  metodo: DepositoMetodo;
  valor_mzn: number | null;
  valor_usd: number;
  valor_liquido_usd: number | null;
  codigo_tx: string | null;
  rate_id: string | null;
  comissao: number;
  taxa: number;
  agent_id: string | null;
  estado: DepositoEstado;
  motivo_recusa: string | null;
  referencia: string;
  provedor_ref: string | null;
  endereco_pagamento: string | null;
  criado_em: string;
  decidido_em: string | null;
}

export type LevantamentoMetodo = "mpesa" | "emola" | "usdt_trc20";
export type LevantamentoEstado =
  | "criada"
  | "aguardando_agente"
  | "atribuida"
  | "em_processamento"
  | "enviada"
  | "aguardando_confirmacao"
  | "concluida"
  | "cancelada"
  | "em_disputa";

export interface Withdrawal {
  id: string;
  user_id: string;
  metodo: LevantamentoMetodo;
  valor_usd: number;
  valor_mzn: number | null;
  valor_liquido_mzn: number | null;
  taxa: number;
  comissao: number;
  destino: string;
  rate_id: string | null;
  agent_id: string | null;
  referencia: string;
  codigo_tx: string | null;
  estado: LevantamentoEstado;
  observacoes: string | null;
  criado_em: string;
  concluida_em: string | null;
}

export type AgenteOperadora = "mpesa" | "emola" | "ambas";
export type AgenteEstado = "pendente" | "ativo" | "suspenso" | "inativo";

export interface Agent {
  id: string;
  user_id: string;
  operadora: AgenteOperadora;
  limite_diario: number;
  disponivel: boolean;
  comissao_pct: number;
  estado: AgenteEstado;
  avaliacao_media: number;
  total_operacoes: number;
  operacoes_concluidas: number;
  tempo_resposta_min: number;
  localizacao: string | null;
  criado_em: string;
}

export type OrderTipo = "deposito" | "levantamento";
export type OrderEstado = "pendente" | "aceite" | "recusada" | "concluida" | "expirada" | "cancelada" | "em_disputa";

export interface AgentOrder {
  id: string;
  agent_id: string;
  tipo: OrderTipo;
  referencia_id: string;
  estado: OrderEstado;
  expira_em: string;
  criado_em: string;
  aceite_em: string | null;
  concluida_em: string | null;
}

export interface Rate {
  id: string;
  par: string;
  valor: number;
  margem: number;
  criado_por: string | null;
  criado_em: string;
}

export interface Fee {
  id: string;
  chave: string;
  valor: number;
  moeda: string;
  ativo: boolean;
}

export interface Setting {
  chave: string;
  valor: string;
}

export type NotificationCanal = "in_app" | "sms";
export type NotificationEstado = "pendente" | "enviada" | "falhou" | "lida";

export interface Notification {
  id: string;
  user_id: string;
  tipo: string;
  canal: NotificationCanal;
  titulo: string;
  corpo: string;
  estado: NotificationEstado;
  criado_em: string;
  lido_em: string | null;
}

export type DisputeEstado = "aberta" | "em_analise" | "resolvida" | "recusada";

export interface Dispute {
  id: string;
  referencia_id: string | null;
  tipo: string;
  user_id: string;
  agent_id: string | null;
  estado: DisputeEstado;
  resolucao: string | null;
  detalhes: string | null;
  criado_em: string;
  resolvida_em: string | null;
}

export type KycDocumento = "bi" | "passaporte" | "carta_conducao";
export type KycEstado = "pendente" | "aprovada" | "rejeitada";

export interface KycSubmission {
  id: string;
  user_id: string;
  tipo_documento: KycDocumento;
  numero_documento: string;
  frente_url: string | null;
  verso_url: string | null;
  selfie_url: string | null;
  estado: KycEstado;
  motivo_recusa: string | null;
  criado_em: string;
  decidido_em: string | null;
  decidido_por: string | null;
}

/** "verificado" = tem submissão aprovada; "pendente" = em análise. */
export type KycEstadoCliente = "nao_verificado" | "pendente" | "verificado" | "rejeitada";

export interface OnboardingAnswer {
  id: string;
  user_id: string;
  /** Como pretende usar os cartões (mercado_financeiro, compras_online, criptomoeda, assinaturas, outros). */
  usos: string[];
  /** Que métodos usava antes (mesma lista de valores). */
  metodos_antes: string[];
  criado_em: string;
}

export interface AuditLog {
  id: string;
  ator: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  dados: Record<string, unknown> | null;
  criado_em: string;
}

export interface ApplyLedgerInput {
  userId: string;
  tipo: LedgerTipo;
  valorCents: number; // assinado
  moeda?: string;
  referencia: string;
  descricao: string;
  estado?: LedgerEntry["estado"];
  rateId?: string | null;
}

export interface AdminStats {
  totalUtilizadores: number;
  utilizadoresAtivos: number;
  cartoesEmitidos: number;
  cartoesAtivos: number;
  totalDepositadoCents: number;
  totalLevantadoCents: number;
  volumeMpesaCents: number;
  volumeEmolaCents: number;
  volumeCriptoCents: number;
  comissoesCents: number;
  depositosPendentes: number;
  levantamentosPendentes: number;
  agentesAtivos: number;
  disputasAbertas: number;
  volumeDiario: { dia: string; total: number }[];
}

export interface LedgerFilter {
  tipo?: string;
  limit?: number;
  offset?: number;
}

export interface DepositFilter {
  userId?: string;
  estado?: string;
  agenteId?: string;
  limit?: number;
}

export interface WithdrawalFilter {
  userId?: string;
  estado?: string;
  agenteId?: string;
  limit?: number;
}

export interface OrderFilter {
  agentId?: string;
  estado?: string;
  tipo?: OrderTipo;
  limit?: number;
}
