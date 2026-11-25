import type { Papel } from "./db/types";

/**
 * RBAC — permissões por função.
 *  superadmin    → tudo
 *  admin         → tudo excepto gestão de administradores
 *  financeiro    → operações financeiras (depósitos, levantamentos, taxas)
 *  gestor_agentes→ agentes, ordens e disputas
 *  suporte       → utilizadores (leitura/suspensão), disputas, notificações
 *  auditor       → apenas leitura
 */
export type Permissao =
  | "dashboard.ver"
  | "utilizadores.ver"
  | "utilizadores.editar"
  | "utilizadores.ajustar_saldo"
  | "cartoes.gerir"
  | "planos.gerir"
  | "depositos.aprovar"
  | "levantamentos.gerir"
  | "agentes.gerir"
  | "taxas.gerir"
  | "integracoes.ver"
  | "emola.gerir"
  | "disputas.gerir"
  | "auditoria.ver"
  | "notificacoes.ver"
  | "administradores.gerir"
  | "kyc.gerir";

const TODAS: Permissao[] = [
  "dashboard.ver", "utilizadores.ver", "utilizadores.editar", "utilizadores.ajustar_saldo",
  "cartoes.gerir", "planos.gerir", "depositos.aprovar", "levantamentos.gerir", "agentes.gerir",
  "taxas.gerir", "integracoes.ver", "emola.gerir", "disputas.gerir", "auditoria.ver", "notificacoes.ver", "administradores.gerir", "kyc.gerir",
];

const MAPA: Record<Papel, Permissao[]> = {
  superadmin: TODAS,
  admin: TODAS.filter((p) => p !== "administradores.gerir"),
  financeiro: ["dashboard.ver", "utilizadores.ver", "depositos.aprovar", "levantamentos.gerir", "taxas.gerir", "emola.gerir", "auditoria.ver", "notificacoes.ver"],
  gestor_agentes: ["dashboard.ver", "utilizadores.ver", "agentes.gerir", "disputas.gerir", "levantamentos.gerir", "auditoria.ver", "notificacoes.ver"],
  suporte: ["dashboard.ver", "utilizadores.ver", "utilizadores.editar", "disputas.gerir", "notificacoes.ver", "auditoria.ver"],
  auditor: ["dashboard.ver", "utilizadores.ver", "auditoria.ver", "integracoes.ver", "notificacoes.ver"],
  cliente: [],
  agente: [],
};

export function temPermissao(papel: Papel, ...permissoes: Permissao[]): boolean {
  const concedidas = MAPA[papel] ?? [];
  return permissoes.every((p) => concedidas.includes(p));
}

export function isAdminPapel(papel: Papel): boolean {
  return ["admin", "superadmin", "suporte", "financeiro", "gestor_agentes", "auditor"].includes(papel);
}
