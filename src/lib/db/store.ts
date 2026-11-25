import type {
  AdminStats,
  Agent,
  AgentOrder,
  ApplyLedgerInput,
  AuditLog,
  Card,
  Deposit,
  DepositFilter,
  Dispute,
  EmolaCobranca,
  EmolaCobrancaFilter,
  EmolaSession,
  Fee,
  KycSubmission,
  LedgerEntry,
  LedgerFilter,
  Notification,
  OnboardingAnswer,
  OrderFilter,
  Plan,
  Rate,
  Reservation,
  Session,
  Setting,
  SmsCode,
  User,
  Withdrawal,
  WithdrawalFilter,
} from "./types";

export interface DataStore {
  readonly mode: "demo" | "supabase";

  // ── Utilizadores & sessões ─────────────────────────────────
  insertUser(u: Omit<User, "id" | "criado_em">): Promise<User>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserByTelefone(telefone: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  updateUser(id: string, patch: Partial<User>): Promise<User | null>;
  listUsers(query?: string): Promise<User[]>;

  insertSession(s: Omit<Session, "id" | "criado_em">): Promise<Session>;
  findSessionByTokenHash(hash: string): Promise<{ session: Session; user: User } | null>;
  deleteSession(hash: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;

  insertSmsCode(s: Omit<SmsCode, "id" | "criado_em" | "tentativas" | "verificado_em">): Promise<SmsCode>;
  latestSmsCode(telefone: string, proposito: string): Promise<SmsCode | null>;
  updateSmsCode(id: string, patch: Partial<SmsCode>): Promise<void>;

  // ── Planos & cartões ───────────────────────────────────────
  listPlans(): Promise<Plan[]>;
  findPlan(id: string): Promise<Plan | null>;
  findPlanBySlug(slug: string): Promise<Plan | null>;
  insertPlan(p: Omit<Plan, "id" | "criado_em">): Promise<Plan>;
  updatePlan(id: string, patch: Partial<Plan>): Promise<Plan | null>;

  listAllCards(): Promise<Card[]>;
  listCardsByUser(userId: string): Promise<Card[]>;
  findCard(id: string): Promise<Card | null>;
  insertCard(c: Omit<Card, "id" | "criado_em">): Promise<Card>;
  updateCard(id: string, patch: Partial<Card>): Promise<Card | null>;

  // ── Ledger financeiro (fonte de verdade) ───────────────────
  /** Aplica um lançamento de forma atómica e idempotente (chave: referencia). */
  applyLedger(input: ApplyLedgerInput): Promise<LedgerEntry>;
  listLedger(userId: string, opts?: LedgerFilter): Promise<LedgerEntry[]>;
  balanceCents(userId: string): Promise<number>;

  insertReservation(r: Omit<Reservation, "id" | "criado_em" | "estado">): Promise<Reservation>;
  findReservationByReferencia(referencia: string): Promise<Reservation | null>;
  updateReservation(id: string, patch: Partial<Reservation>): Promise<Reservation | null>;
  activeReservationsCents(userId: string): Promise<number>;

  // ── Depósitos ──────────────────────────────────────────────
  insertDeposit(d: Omit<Deposit, "id" | "criado_em" | "decidido_em">): Promise<Deposit>;
  findDeposit(id: string): Promise<Deposit | null>;
  findDepositByReferencia(referencia: string): Promise<Deposit | null>;
  findDepositByTxCode(codigo: string): Promise<Deposit | null>;
  findDepositByProvedorRef(ref: string): Promise<Deposit | null>;
  updateDeposit(id: string, patch: Partial<Deposit>): Promise<Deposit | null>;
  listDeposits(filter?: DepositFilter): Promise<Deposit[]>;

  // ── Levantamentos ──────────────────────────────────────────
  insertWithdrawal(w: Omit<Withdrawal, "id" | "criado_em" | "concluida_em">): Promise<Withdrawal>;
  findWithdrawal(id: string): Promise<Withdrawal | null>;
  findWithdrawalByReferencia(referencia: string): Promise<Withdrawal | null>;
  updateWithdrawal(id: string, patch: Partial<Withdrawal>): Promise<Withdrawal | null>;
  listWithdrawals(filter?: WithdrawalFilter): Promise<Withdrawal[]>;

  // ── Agentes & ordens ───────────────────────────────────────
  insertAgent(a: Omit<Agent, "id" | "criado_em" | "avaliacao_media" | "total_operacoes" | "operacoes_concluidas" | "tempo_resposta_min">): Promise<Agent>;
  findAgent(id: string): Promise<Agent | null>;
  findAgentByUserId(userId: string): Promise<Agent | null>;
  findAgentById(id: string): Promise<Agent | null>;
  updateAgent(id: string, patch: Partial<Agent>): Promise<Agent | null>;
  listAgents(filter?: { estado?: string }): Promise<Agent[]>;

  insertOrder(o: Omit<AgentOrder, "id" | "criado_em" | "aceite_em" | "concluida_em">): Promise<AgentOrder>;
  findOrder(id: string): Promise<AgentOrder | null>;
  updateOrder(id: string, patch: Partial<AgentOrder>): Promise<AgentOrder | null>;
  listOrders(filter?: OrderFilter): Promise<AgentOrder[]>;

  // ── Taxas, câmbio & definições ─────────────────────────────
  listRates(): Promise<Rate[]>;
  insertRate(r: Omit<Rate, "id" | "criado_em">): Promise<Rate>;
  latestRate(par: string): Promise<Rate | null>;
  listFees(): Promise<Fee[]>;
  upsertFee(chave: string, valor: number, moeda?: string, ativo?: boolean): Promise<Fee>;
  listSettings(): Promise<Setting[]>;
  setSetting(chave: string, valor: string): Promise<void>;

  // ── Onboarding & KYC ───────────────────────────────────────
  upsertOnboardingAnswer(userId: string, usos: string[], metodosAntes: string[]): Promise<OnboardingAnswer>;
  findOnboardingAnswer(userId: string): Promise<OnboardingAnswer | null>;

  insertKycSubmission(s: Omit<KycSubmission, "id" | "criado_em" | "decidido_em" | "decidido_por" | "estado" | "motivo_recusa">): Promise<KycSubmission>;
  listKycSubmissions(filter?: { estado?: KycSubmission["estado"] }): Promise<KycSubmission[]>;
  findLatestKycByUser(userId: string): Promise<KycSubmission | null>;
  updateKycSubmission(id: string, patch: Partial<Pick<KycSubmission, "estado" | "motivo_recusa" | "decidido_em" | "decidido_por">>): Promise<KycSubmission | null>;

  // ── Notificações ───────────────────────────────────────────
  insertNotification(n: Omit<Notification, "id" | "criado_em" | "lido_em">): Promise<Notification>;
  listNotifications(userId: string, limit?: number): Promise<Notification[]>;
  markNotificationRead(id: string, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  listAllNotifications(): Promise<Notification[]>;

  // ── Disputas ───────────────────────────────────────────────
  insertDispute(d: Omit<Dispute, "id" | "criado_em" | "resolvida_em">): Promise<Dispute>;
  findDispute(id: string): Promise<Dispute | null>;
  updateDispute(id: string, patch: Partial<Dispute>): Promise<Dispute | null>;
  listDisputes(): Promise<Dispute[]>;

  // ── e-Mola (gateway de cobrança directa) ──────────────────
  upsertEmolaSession(s: Omit<EmolaSession, "criado_em" | "atualizado_em">): Promise<EmolaSession>;
  findEmolaSession(phone: string): Promise<EmolaSession | null>;
  updateEmolaSession(phone: string, patch: Partial<EmolaSession>): Promise<EmolaSession | null>;
  deleteEmolaSession(phone: string): Promise<void>;

  insertEmolaCobranca(c: Omit<EmolaCobranca, "id" | "criado_em" | "concluido_em">): Promise<EmolaCobranca>;
  findEmolaCobranca(id: string): Promise<EmolaCobranca | null>;
  updateEmolaCobranca(id: string, patch: Partial<EmolaCobranca>): Promise<EmolaCobranca | null>;
  listEmolaCobrancas(filter?: EmolaCobrancaFilter): Promise<EmolaCobranca[]>;

  // ── Auditoria ──────────────────────────────────────────────
  insertAudit(a: Omit<AuditLog, "id" | "criado_em">): Promise<void>;
  listAudit(limit?: number): Promise<AuditLog[]>;

  // ── Estatísticas de administração ───────────────────────────
  adminStats(): Promise<AdminStats>;
}
