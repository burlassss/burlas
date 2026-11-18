import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DataStore } from "./store";
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
  Fee,
  LedgerEntry,
  LedgerFilter,
  Notification,
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
import { dbToCents, fromCents } from "../money";

/**
 * Implementação Supabase do DataStore.
 * Toda a escrita financeira passa pela função Postgres `apply_ledger`
 * (ver supabase/migrations/0001_init.sql), que garante atomicidade e
 * idempotência por `referencia`.
 */
export class SupabaseStore implements DataStore {
  readonly mode = "supabase" as const;
  private s: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.s = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  private async one<T>(q: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T | null> {
    const { data, error } = await q;
    if (error) throw new Error(`Supabase: ${error.message}`);
    return data;
  }

  // ── Utilizadores ───────────────────────────────────────────
  async insertUser(u: Omit<User, "id" | "criado_em">): Promise<User> {
    const row = await this.one<User>(this.s.from("users").insert(u).select().single());
    return row!;
  }
  async findUserByEmail(email: string) {
    return this.one<User>(this.s.from("users").select().eq("email", email.toLowerCase()).maybeSingle());
  }
  async findUserByTelefone(telefone: string) {
    return this.one<User>(this.s.from("users").select().eq("telefone", telefone).maybeSingle());
  }
  async findUserById(id: string) {
    return this.one<User>(this.s.from("users").select().eq("id", id).maybeSingle());
  }
  async updateUser(id: string, patch: Partial<User>) {
    return this.one<User>(this.s.from("users").update(patch).eq("id", id).select().maybeSingle());
  }
  async listUsers(query?: string) {
    let q = this.s.from("users").select().order("criado_em", { ascending: false }).limit(500);
    if (query) {
      const term = `%${query}%`;
      q = q.or(`nome.ilike.${term},email.ilike.${term},telefone.ilike.${term}`);
    }
    const { data, error } = await q;
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []) as User[];
  }

  // ── Sessões ────────────────────────────────────────────────
  async insertSession(s: Omit<Session, "id" | "criado_em">): Promise<Session> {
    const row = await this.one<Session>(this.s.from("sessions").insert(s).select().single());
    return row!;
  }
  async findSessionByTokenHash(hash: string) {
    const session = await this.one<Session>(
      this.s.from("sessions").select().eq("token_hash", hash).gt("expira_em", new Date().toISOString()).maybeSingle(),
    );
    if (!session) return null;
    const user = await this.findUserById(session.user_id);
    if (!user) return null;
    return { session, user };
  }
  async deleteSession(hash: string) {
    await this.s.from("sessions").delete().eq("token_hash", hash);
  }
  async deleteUserSessions(userId: string) {
    await this.s.from("sessions").delete().eq("user_id", userId);
  }

  // ── SMS ────────────────────────────────────────────────────
  async insertSmsCode(s: Omit<SmsCode, "id" | "criado_em" | "tentativas" | "verificado_em">): Promise<SmsCode> {
    const row = await this.one<SmsCode>(this.s.from("sms_codes").insert(s).select().single());
    return row!;
  }
  async latestSmsCode(telefone: string, proposito: string) {
    return this.one<SmsCode>(
      this.s.from("sms_codes").select().eq("telefone", telefone).eq("proposito", proposito).order("criado_em", { ascending: false }).limit(1).maybeSingle(),
    );
  }
  async updateSmsCode(id: string, patch: Partial<SmsCode>) {
    await this.s.from("sms_codes").update(patch).eq("id", id);
  }

  // ── Planos ─────────────────────────────────────────────────
  async listPlans() {
    const { data, error } = await this.s.from("plans").select().order("ordem");
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []) as Plan[];
  }
  async findPlan(id: string) {
    return this.one<Plan>(this.s.from("plans").select().eq("id", id).maybeSingle());
  }
  async findPlanBySlug(slug: string) {
    return this.one<Plan>(this.s.from("plans").select().eq("slug", slug).maybeSingle());
  }
  async insertPlan(p: Omit<Plan, "id" | "criado_em">): Promise<Plan> {
    const row = await this.one<Plan>(this.s.from("plans").insert(p).select().single());
    return row!;
  }
  async updatePlan(id: string, patch: Partial<Plan>) {
    return this.one<Plan>(this.s.from("plans").update(patch).eq("id", id).select().maybeSingle());
  }

  // ── Cartões ────────────────────────────────────────────────
  async listAllCards() {
    const { data, error } = await this.s.from("cards").select().order("criado_em", { ascending: false }).limit(500);
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []) as Card[];
  }
  async listCardsByUser(userId: string) {
    const { data, error } = await this.s.from("cards").select().eq("user_id", userId).order("criado_em", { ascending: false });
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []) as Card[];
  }
  async findCard(id: string) {
    return this.one<Card>(this.s.from("cards").select().eq("id", id).maybeSingle());
  }
  async insertCard(c: Omit<Card, "id" | "criado_em">): Promise<Card> {
    const row = await this.one<Card>(this.s.from("cards").insert(c).select().single());
    return row!;
  }
  async updateCard(id: string, patch: Partial<Card>) {
    return this.one<Card>(this.s.from("cards").update(patch).eq("id", id).select().maybeSingle());
  }

  // ── Ledger ─────────────────────────────────────────────────
  async applyLedger(input: ApplyLedgerInput): Promise<LedgerEntry> {
    const { data, error } = await this.s.rpc("apply_ledger", {
      p_user_id: input.userId,
      p_tipo: input.tipo,
      p_valor: fromCents(input.valorCents),
      p_moeda: input.moeda ?? "USD",
      p_referencia: input.referencia,
      p_descricao: input.descricao,
      p_estado: input.estado ?? "confirmado",
      p_rate_id: input.rateId ?? null,
    });
    if (error) {
      if (error.message.includes("SALDO_INSUFICIENTE")) throw new Error("SALDO_INSUFICIENTE");
      throw new Error(`Supabase: ${error.message}`);
    }
    return data as LedgerEntry;
  }
  async listLedger(userId: string, opts?: LedgerFilter) {
    let q = this.s.from("ledger_entries").select().eq("user_id", userId).order("criado_em", { ascending: false });
    if (opts?.tipo && opts.tipo !== "todas") q = q.eq("tipo", opts.tipo);
    if (opts?.offset) q = q.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);
    else if (opts?.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []) as LedgerEntry[];
  }
  async balanceCents(userId: string) {
    const { data, error } = await this.s.from("ledger_entries").select("valor").eq("user_id", userId);
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []).reduce((acc, e) => acc + dbToCents((e as { valor: number }).valor), 0);
  }

  async insertReservation(r: Omit<Reservation, "id" | "criado_em" | "estado">): Promise<Reservation> {
    const row = await this.one<Reservation>(this.s.from("reservations").insert({ ...r, estado: "ativa" }).select().single());
    return row!;
  }
  async findReservationByReferencia(referencia: string) {
    return this.one<Reservation>(this.s.from("reservations").select().eq("referencia", referencia).maybeSingle());
  }
  async updateReservation(id: string, patch: Partial<Reservation>) {
    return this.one<Reservation>(this.s.from("reservations").update(patch).eq("id", id).select().maybeSingle());
  }
  async activeReservationsCents(userId: string) {
    const { data, error } = await this.s.from("reservations").select("valor_usd").eq("user_id", userId).eq("estado", "ativa");
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []).reduce((acc, r) => acc + dbToCents((r as { valor_usd: number }).valor_usd), 0);
  }

  // ── Depósitos ──────────────────────────────────────────────
  async insertDeposit(d: Omit<Deposit, "id" | "criado_em" | "decidido_em">): Promise<Deposit> {
    const row = await this.one<Deposit>(this.s.from("deposits").insert(d).select().single());
    return row!;
  }
  async findDeposit(id: string) {
    return this.one<Deposit>(this.s.from("deposits").select().eq("id", id).maybeSingle());
  }
  async findDepositByReferencia(referencia: string) {
    return this.one<Deposit>(this.s.from("deposits").select().eq("referencia", referencia).maybeSingle());
  }
  async findDepositByTxCode(codigo: string) {
    return this.one<Deposit>(this.s.from("deposits").select().ilike("codigo_tx", codigo).maybeSingle());
  }
  async findDepositByProvedorRef(ref: string) {
    return this.one<Deposit>(this.s.from("deposits").select().eq("provedor_ref", ref).maybeSingle());
  }
  async updateDeposit(id: string, patch: Partial<Deposit>) {
    return this.one<Deposit>(this.s.from("deposits").update(patch).eq("id", id).select().maybeSingle());
  }
  async listDeposits(filter?: DepositFilter) {
    let q = this.s.from("deposits").select().order("criado_em", { ascending: false });
    if (filter?.userId) q = q.eq("user_id", filter.userId);
    if (filter?.estado) q = q.eq("estado", filter.estado);
    if (filter?.agenteId) q = q.eq("agent_id", filter.agenteId);
    if (filter?.limit) q = q.limit(filter.limit);
    const { data, error } = await q;
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []) as Deposit[];
  }

  // ── Levantamentos ──────────────────────────────────────────
  async insertWithdrawal(w: Omit<Withdrawal, "id" | "criado_em" | "concluida_em">): Promise<Withdrawal> {
    const row = await this.one<Withdrawal>(this.s.from("withdrawals").insert(w).select().single());
    return row!;
  }
  async findWithdrawal(id: string) {
    return this.one<Withdrawal>(this.s.from("withdrawals").select().eq("id", id).maybeSingle());
  }
  async findWithdrawalByReferencia(referencia: string) {
    return this.one<Withdrawal>(this.s.from("withdrawals").select().eq("referencia", referencia).maybeSingle());
  }
  async updateWithdrawal(id: string, patch: Partial<Withdrawal>) {
    return this.one<Withdrawal>(this.s.from("withdrawals").update(patch).eq("id", id).select().maybeSingle());
  }
  async listWithdrawals(filter?: WithdrawalFilter) {
    let q = this.s.from("withdrawals").select().order("criado_em", { ascending: false });
    if (filter?.userId) q = q.eq("user_id", filter.userId);
    if (filter?.estado) q = q.eq("estado", filter.estado);
    if (filter?.agenteId) q = q.eq("agent_id", filter.agenteId);
    if (filter?.limit) q = q.limit(filter.limit);
    const { data, error } = await q;
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []) as Withdrawal[];
  }

  // ── Agentes ────────────────────────────────────────────────
  async insertAgent(a: Omit<Agent, "id" | "criado_em" | "avaliacao_media" | "total_operacoes" | "operacoes_concluidas" | "tempo_resposta_min">): Promise<Agent> {
    const row = await this.one<Agent>(this.s.from("agents").insert(a).select().single());
    return row!;
  }
  async findAgent(id: string) {
    return this.one<Agent>(this.s.from("agents").select().eq("id", id).maybeSingle());
  }
  async findAgentByUserId(userId: string) {
    return this.one<Agent>(this.s.from("agents").select().eq("user_id", userId).maybeSingle());
  }
  async findAgentById(id: string) {
    return this.findAgent(id);
  }
  async updateAgent(id: string, patch: Partial<Agent>) {
    return this.one<Agent>(this.s.from("agents").update(patch).eq("id", id).select().maybeSingle());
  }
  async listAgents(filter?: { estado?: string }) {
    let q = this.s.from("agents").select().order("criado_em", { ascending: false });
    if (filter?.estado) q = q.eq("estado", filter.estado);
    const { data, error } = await q;
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []) as Agent[];
  }

  async insertOrder(o: Omit<AgentOrder, "id" | "criado_em" | "aceite_em" | "concluida_em">): Promise<AgentOrder> {
    const row = await this.one<AgentOrder>(this.s.from("agent_orders").insert(o).select().single());
    return row!;
  }
  async findOrder(id: string) {
    return this.one<AgentOrder>(this.s.from("agent_orders").select().eq("id", id).maybeSingle());
  }
  async updateOrder(id: string, patch: Partial<AgentOrder>) {
    return this.one<AgentOrder>(this.s.from("agent_orders").update(patch).eq("id", id).select().maybeSingle());
  }
  async listOrders(filter?: OrderFilter) {
    let q = this.s.from("agent_orders").select().order("criado_em", { ascending: false });
    if (filter?.agentId) q = q.eq("agent_id", filter.agentId);
    if (filter?.estado) q = q.eq("estado", filter.estado);
    if (filter?.tipo) q = q.eq("tipo", filter.tipo);
    if (filter?.limit) q = q.limit(filter.limit);
    const { data, error } = await q;
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []) as AgentOrder[];
  }

  // ── Taxas, câmbio & definições ─────────────────────────────
  async listRates() {
    const { data, error } = await this.s.from("rates").select().order("criado_em", { ascending: false });
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []) as Rate[];
  }
  async insertRate(r: Omit<Rate, "id" | "criado_em">): Promise<Rate> {
    const row = await this.one<Rate>(this.s.from("rates").insert(r).select().single());
    return row!;
  }
  async latestRate(par: string) {
    return this.one<Rate>(this.s.from("rates").select().eq("par", par).order("criado_em", { ascending: false }).limit(1).maybeSingle());
  }
  async listFees() {
    const { data, error } = await this.s.from("fees").select();
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []) as Fee[];
  }
  async upsertFee(chave: string, valor: number, moeda = "USD", ativo = true): Promise<Fee> {
    const row = await this.one<Fee>(this.s.from("fees").upsert({ chave, valor, moeda, ativo }, { onConflict: "chave" }).select().single());
    return row!;
  }
  async listSettings() {
    const { data, error } = await this.s.from("settings").select();
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []) as Setting[];
  }
  async setSetting(chave: string, valor: string) {
    await this.s.from("settings").upsert({ chave, valor }, { onConflict: "chave" });
  }

  // ── Notificações ───────────────────────────────────────────
  async insertNotification(n: Omit<Notification, "id" | "criado_em" | "lido_em">): Promise<Notification> {
    const row = await this.one<Notification>(this.s.from("notifications").insert(n).select().single());
    return row!;
  }
  async listNotifications(userId: string, limit = 50) {
    const { data, error } = await this.s.from("notifications").select().eq("user_id", userId).order("criado_em", { ascending: false }).limit(limit);
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []) as Notification[];
  }
  async markNotificationRead(id: string, userId: string) {
    await this.s.from("notifications").update({ estado: "lida", lido_em: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
  }
  async markAllNotificationsRead(userId: string) {
    await this.s.from("notifications").update({ estado: "lida", lido_em: new Date().toISOString() }).eq("user_id", userId).neq("estado", "lida");
  }
  async listAllNotifications() {
    const { data, error } = await this.s.from("notifications").select().order("criado_em", { ascending: false }).limit(200);
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []) as Notification[];
  }

  // ── Disputas ───────────────────────────────────────────────
  async insertDispute(d: Omit<Dispute, "id" | "criado_em" | "resolvida_em">): Promise<Dispute> {
    const row = await this.one<Dispute>(this.s.from("disputes").insert(d).select().single());
    return row!;
  }
  async findDispute(id: string) {
    return this.one<Dispute>(this.s.from("disputes").select().eq("id", id).maybeSingle());
  }
  async updateDispute(id: string, patch: Partial<Dispute>) {
    return this.one<Dispute>(this.s.from("disputes").update(patch).eq("id", id).select().maybeSingle());
  }
  async listDisputes() {
    const { data, error } = await this.s.from("disputes").select().order("criado_em", { ascending: false });
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []) as Dispute[];
  }

  // ── Auditoria ──────────────────────────────────────────────
  async insertAudit(a: Omit<AuditLog, "id" | "criado_em">) {
    await this.s.from("audit_log").insert(a);
  }
  async listAudit(limit = 100) {
    const { data, error } = await this.s.from("audit_log").select().order("criado_em", { ascending: false }).limit(limit);
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data ?? []) as AuditLog[];
  }

  // ── Estatísticas de administração ───────────────────────────
  async adminStats(): Promise<AdminStats> {
    const [usersRes, cardsRes, depositsRes, withdrawalsRes, agentsRes, disputesRes] = await Promise.all([
      this.s.from("users").select("id, estado, papel"),
      this.s.from("cards").select("id, estado"),
      this.s.from("deposits").select("*"),
      this.s.from("withdrawals").select("*"),
      this.s.from("agents").select("id, estado"),
      this.s.from("disputes").select("id, estado"),
    ]);
    const users = (usersRes.data ?? []) as Pick<User, "id" | "estado" | "papel">[];
    const cards = (cardsRes.data ?? []) as Pick<Card, "id" | "estado">[];
    const deposits = (depositsRes.data ?? []) as Deposit[];
    const withdrawals = (withdrawalsRes.data ?? []) as Withdrawal[];
    const agents = (agentsRes.data ?? []) as Pick<Agent, "id" | "estado">[];
    const disputes = (disputesRes.data ?? []) as Pick<Dispute, "id" | "estado">[];

    const c = (v: number | null | undefined) => dbToCents(v ?? 0);
    const aprovados = deposits.filter((d) => d.estado === "aprovado");
    const concluidos = withdrawals.filter((w) => w.estado === "concluida");
    const valorDep = (d: Deposit) => c(d.valor_liquido_usd ?? d.valor_usd);

    // Série diária dos últimos 14 dias (depósitos confirmados no ledger)
    const { data: ledgerDep } = await this.s.from("ledger_entries").select("valor, criado_em").eq("tipo", "deposito").gte("criado_em", new Date(Date.now() - 13 * 86400000).toISOString());
    const dias: { dia: string; total: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      const total = ((ledgerDep ?? []) as Pick<LedgerEntry, "valor" | "criado_em">[])
        .filter((e) => e.criado_em.slice(0, 10) === key)
        .reduce((acc, e) => acc + c(e.valor), 0);
      dias.push({ dia: day.toLocaleDateString("pt-MZ", { day: "2-digit", month: "short" }), total: fromCents(total) });
    }

    return {
      totalUtilizadores: users.filter((u) => u.papel === "cliente" || u.papel === "agente").length,
      utilizadoresAtivos: users.filter((u) => (u.papel === "cliente" || u.papel === "agente") && u.estado === "ativo").length,
      cartoesEmitidos: cards.length,
      cartoesAtivos: cards.filter((x) => x.estado === "ativo").length,
      totalDepositadoCents: aprovados.reduce((acc, d) => acc + valorDep(d), 0),
      totalLevantadoCents: concluidos.reduce((acc, w) => acc + c(w.valor_usd), 0),
      volumeMpesaCents: aprovados.filter((d) => d.metodo === "mpesa").reduce((acc, d) => acc + valorDep(d), 0),
      volumeEmolaCents: aprovados.filter((d) => d.metodo === "emola").reduce((acc, d) => acc + valorDep(d), 0),
      volumeCriptoCents: aprovados.filter((d) => d.metodo === "usdt_trc20").reduce((acc, d) => acc + valorDep(d), 0),
      comissoesCents: aprovados.reduce((acc, d) => acc + c(d.comissao) + c(d.taxa), 0),
      depositosPendentes: deposits.filter((d) => ["pendente_analise", "aguardando_pagamento", "identificado", "aguardando_confirmacoes"].includes(d.estado)).length,
      levantamentosPendentes: withdrawals.filter((w) => ["criada", "aguardando_agente", "atribuida", "em_processamento", "enviada", "aguardando_confirmacao"].includes(w.estado)).length,
      agentesAtivos: agents.filter((a) => a.estado === "ativo").length,
      disputasAbertas: disputes.filter((d) => d.estado === "aberta" || d.estado === "em_analise").length,
      volumeDiario: dias,
    };
  }
}
