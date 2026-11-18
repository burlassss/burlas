import {
  BadgeCheck, BellRing, CreditCard, ShieldAlert, ArrowDownLeft, ArrowUpRight,
  KeyRound, Truck, ShieldCheck, Snowflake, CircleDollarSign, Bell,
} from "lucide-react";

export const MOVIMENTO_ICONES: Record<string, React.ElementType> = {
  codigo_verificacao: KeyRound,
  conta_ativada: BadgeCheck,
  cartao_emitido: CreditCard,
  cartao_congelado: Snowflake,
  cartao_descongelado: CreditCard,
  deposito_recebido: ArrowDownLeft,
  deposito_aprovado: CircleDollarSign,
  deposito_recusado: ShieldAlert,
  levantamento_solicitado: ArrowUpRight,
  levantamento_concluido: Truck,
  levantamento_cancelado: ShieldAlert,
  nova_ordem_agente: BellRing,
  ordem_atribuida: BellRing,
  disputa_aberta: ShieldAlert,
  disputa_resolvida: ShieldCheck,
  seguranca: ShieldAlert,
  default: Bell,
};
