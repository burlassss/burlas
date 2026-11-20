import crypto from "node:crypto";
import bcrypt from "bcryptjs";
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
import { centsToDb, fromCents, referencia } from "../money";

interface DBData {
  users: User[];
  sessions: Session[];
  smsCodes: SmsCode[];
  plans: Plan[];
  cards: Card[];
  ledger: LedgerEntry[];
  reservations: Reservation[];
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  agents: Agent[];
  orders: AgentOrder[];
  rates: Rate[];
  fees: Fee[];
  settings: Setting[];
  notifications: Notification[];
  disputes: Dispute[];
  audit: AuditLog[];
}

const agora = () => new Date().toISOString();
const isoHa = (minutos: number) => new Date(Date.now() - minutos * 60_000).toISOString();
const uuid = () => crypto.randomUUID();
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function u(parcial: Omit<User, "id" | "criado_em" | "password_hash"> & { password: string }): User {
  const { password, ...rest } = parcial;
  return {
    ...rest,
    id: uuid(),
    password_hash: bcrypt.hashSync(password, 10),
    criado_em: isoHa(60 * 24 * 190),
  };
}

function seed(): DBData {
  // ── Avaliação local, sem dados fictícios ─────────────────────────────
  // Apenas o necessário para avaliar a plataforma: um superadmin e dois
  // agentes de avaliação, com histórico zerado (nenhuma operação/avalição).
  // Nenhuma transação, saldo, cartão, disputa ou notificação é pré-carregada.
  const admin = u({ nome: "Administrador Geral", email: "admin@mozout.co.mz", telefone: "+258840000001", nascimento: "1990-01-01", password: "Mozout#Admin2026", estado: "ativo", telefone_verificado: true, papel: "superadmin" });
  const agenteMpesaUser = u({ nome: "Agente M-Pesa (avaliação)", email: "agente.mpesa@example.com", telefone: "+258842468135", nascimento: "1990-01-01", password: "Agente#123", estado: "ativo", telefone_verificado: true, papel: "agente" });
  const agenteEmolaUser = u({ nome: "Agente e-Mola (avaliação)", email: "agente.emola@example.com", telefone: "+258863579246", nascimento: "1990-01-01", password: "Agente#123", estado: "ativo", telefone_verificado: true, papel: "agente" });

  const plans: Plan[] = [
    {
      id: uuid(), nome: "Compras Online", slug: "compras-online", tipo: "compras", tier: "platina", tema: null,
      descricao: "Para lojas internacionais, e-commerce e serviços digitais. Ideal para Amazon, AliExpress, Shein e subscrições avulsas.",
      imagem: null, moedas: ["USD", "EUR", "GBP"], taxa_ativacao_usd: 10, mensalidade_usd: 2.5,
      limite_gasto_usd: 2000, limite_carga_usd: 5000, validade_meses: 36, ordem: 1, ativo: true, destaque: true,
      cor: "from-[#101f16] via-[#173a29] to-[#0b241a]", icone: "shopping-bag",
      beneficios: ["Aceite em milhões de lojas online", "3-D Secure e alertas em tempo real", "Congelar e descongelar quando quiseres", "CVV dinâmico por compra"],
      criado_em: agora(),
    },
    {
      id: uuid(), nome: "Assinaturas", slug: "assinaturas", tipo: "assinaturas", tier: "gold", tema: null,
      descricao: "Feito para pagamentos recorrentes: streaming, ferramentas de IA, software, publicidade e alojamento.",
      imagem: null, moedas: ["USD", "EUR"], taxa_ativacao_usd: 5, mensalidade_usd: 1.5,
      limite_gasto_usd: 1000, limite_carga_usd: 3000, validade_meses: 24, ordem: 2, ativo: true, destaque: false,
      cor: "from-[#141425] via-[#232147] to-[#0e0e20]", icone: "repeat",
      beneficios: ["Ideal para Netflix, Spotify, OpenAI, Google Ads", "Débito recorrente sem fricção", "Limites por comerciante configuráveis", "Reembolso automático de cobranças indevidas"],
      criado_em: agora(),
    },
    {
      id: uuid(), nome: "Viagem", slug: "viagem", tipo: "viagem", tier: "black", tema: null,
      descricao: "Pagamentos em deslocação internacional: hotéis, voos, restaurantes e compras fora de Moçambique.",
      imagem: null, moedas: ["USD", "EUR", "GBP", "ZAR", "AOA"], taxa_ativacao_usd: 15, mensalidade_usd: 0,
      limite_gasto_usd: 5000, limite_carga_usd: 10000, validade_meses: 60, ordem: 3, ativo: true, destaque: false,
      cor: "from-[#1c130b] via-[#3a2712] to-[#241408]", icone: "plane",
      beneficios: ["Sem mensalidade para sempre", "Multi-moeda na mesma carteira", "Cobertura internacional completa", "Seguro de compra incluído"],
      criado_em: agora(),
    },
  ];

  const agents: Agent[] = [
    { id: uuid(), user_id: agenteMpesaUser.id, operadora: "mpesa", limite_diario: 1000, disponivel: true, comissao_pct: 1.0, estado: "ativo", avaliacao_media: 0, total_operacoes: 0, operacoes_concluidas: 0, tempo_resposta_min: 5, localizacao: null, criado_em: agora() },
    { id: uuid(), user_id: agenteEmolaUser.id, operadora: "emola", limite_diario: 1000, disponivel: true, comissao_pct: 1.0, estado: "ativo", avaliacao_media: 0, total_operacoes: 0, operacoes_concluidas: 0, tempo_resposta_min: 5, localizacao: null, criado_em: agora() },
  ];

  const rates: Rate[] = [
    { id: uuid(), par: "USD/MZN", valor: 63.8, margem: 1.5, criado_por: admin.id, criado_em: agora() },
  ];

  const fees: Fee[] = [
    { id: uuid(), chave: "deposito_mpesa_pct", valor: 1.5, moeda: "MZN", ativo: true },
    { id: uuid(), chave: "deposito_emola_pct", valor: 1.5, moeda: "MZN", ativo: true },
    { id: uuid(), chave: "deposito_usdt_pct", valor: 0.5, moeda: "USDT", ativo: true },
    { id: uuid(), chave: "levantamento_mpesa_usd", valor: 2.5, moeda: "USD", ativo: true },
    { id: uuid(), chave: "levantamento_emola_usd", valor: 2.5, moeda: "USD", ativo: true },
    { id: uuid(), chave: "levantamento_usdt_usd", valor: 1.5, moeda: "USD", ativo: true },
    { id: uuid(), chave: "comissao_agente_pct", valor: 1.0, moeda: "USD", ativo: true },
    { id: uuid(), chave: "cambio_margem_pct", valor: 1.5, moeda: "MZN", ativo: true },
  ];

  const settings: Setting[] = [
    { chave: "plataforma_nome", valor: "MOZOUT-USD" },
    { chave: "suporte_email", valor: "suporte@mozout.co.mz" },
    { chave: "manutencao", valor: "false" },
    { chave: "limite_deposito_dia_usd", valor: "5000" },
    { chave: "limite_levantamento_dia_usd", valor: "3000" },
  ];

  return {
    users: [admin, agenteMpesaUser, agenteEmolaUser],
    sessions: [],
    smsCodes: [],
    plans,
    cards: [],
    ledger: [],
    reservations: [],
    deposits: [],
    withdrawals: [],
    agents,
    orders: [],
    rates,
    fees,
    settings,
    notifications: [],
    disputes: [],
    audit: [],
  };
}

interface GlobalWithSeed {
  __mozoutDemoData?: DBData;
}

function store(): DBData {
  const g = globalThis as GlobalWithSeed;
  if (!g.__mozoutDemoData) g.__mozoutDemoData = seed();
  return g.__mozoutDemoData;
}

const cloneList = <T,>(rows: T[]): T[] => rows.map((r) => clone(r));
const cents = (n: number) => Math.round(n * 100);

export class DemoStore implements DataStore {
  readonly mode = "demo" as const;

  // ── Utilizadores ───────────────────────────────────────────
  async insertUser(u: Omit<User, "id" | "criado_em">): Promise<User> {
    const db = store();
    const row: User = { ...u, id: uuid(), criado_em: agora() };
    db.users.push(row);
    return clone(row);
  }
  async findUserByEmail(email: string) {
    return cloneList(store().users.filter((u) => u.email.toLowerCase() === email.toLowerCase()))[0] ?? null;
  }
  async findUserByTelefone(telefone: string) {
    return cloneList(store().users.filter((u) => u.telefone === telefone))[0] ?? null;
  }
  async findUserById(id: string) {
    const u = store().users.find((x) => x.id === id);
    return u ? clone(u) : null;
  }
  async updateUser(id: string, patch: Partial<User>) {
    const u = store().users.find((x) => x.id === id);
    if (!u) return null;
    Object.assign(u, patch, { id: u.id });
    return clone(u);
  }
  async listUsers(query?: string) {
    let rows = store().users;
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((u) => u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.telefone.includes(q));
    }
    return cloneList(rows);
  }

  // ── Sessões ────────────────────────────────────────────────
  async insertSession(s: Omit<Session, "id" | "criado_em">): Promise<Session> {
    const row: Session = { ...s, id: uuid(), criado_em: agora() };
    store().sessions.push(row);
    return clone(row);
  }
  async findSessionByTokenHash(hash: string) {
    const db = store();
    const s = db.sessions.find((x) => x.token_hash === hash);
    if (!s) return null;
    if (new Date(s.expira_em).getTime() < Date.now()) {
      db.sessions = db.sessions.filter((x) => x.id !== s.id);
      return null;
    }
    const user = db.users.find((x) => x.id === s.user_id);
    if (!user) return null;
    return { session: clone(s), user: clone(user) };
  }
  async deleteSession(hash: string) {
    const db = store();
    db.sessions = db.sessions.filter((s) => s.token_hash !== hash);
  }
  async deleteUserSessions(userId: string) {
    const db = store();
    db.sessions = db.sessions.filter((s) => s.user_id !== userId);
  }

  // ── SMS ────────────────────────────────────────────────────
  async insertSmsCode(s: Omit<SmsCode, "id" | "criado_em" | "tentativas" | "verificado_em">): Promise<SmsCode> {
    const row: SmsCode = { ...s, id: uuid(), tentativas: 0, verificado_em: null, criado_em: agora() };
    store().smsCodes.push(row);
    return clone(row);
  }
  async latestSmsCode(telefone: string, proposito: string) {
    const rows = store().smsCodes.filter((s) => s.telefone === telefone && s.proposito === proposito);
    rows.sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    return rows[0] ? clone(rows[0]) : null;
  }
  async updateSmsCode(id: string, patch: Partial<SmsCode>) {
    const row = store().smsCodes.find((s) => s.id === id);
    if (row) Object.assign(row, patch, { id: row.id });
  }

  // ── Planos ─────────────────────────────────────────────────
  async listPlans() {
    return cloneList([...store().plans].sort((a, b) => a.ordem - b.ordem));
  }
  async findPlan(id: string) {
    const p = store().plans.find((x) => x.id === id);
    return p ? clone(p) : null;
  }
  async findPlanBySlug(slug: string) {
    const p = store().plans.find((x) => x.slug === slug);
    return p ? clone(p) : null;
  }
  async insertPlan(p: Omit<Plan, "id" | "criado_em">): Promise<Plan> {
    const row: Plan = { ...p, id: uuid(), criado_em: agora() };
    store().plans.push(row);
    return clone(row);
  }
  async updatePlan(id: string, patch: Partial<Plan>) {
    const p = store().plans.find((x) => x.id === id);
    if (!p) return null;
    Object.assign(p, patch, { id: p.id });
    return clone(p);
  }

  // ── Cartões ────────────────────────────────────────────────
  async listAllCards() {
    return cloneList(store().cards);
  }
  async listCardsByUser(userId: string) {
    return cloneList(store().cards.filter((c) => c.user_id === userId));
  }
  async findCard(id: string) {
    const c = store().cards.find((x) => x.id === id);
    return c ? clone(c) : null;
  }
  async insertCard(c: Omit<Card, "id" | "criado_em">): Promise<Card> {
    const row: Card = { ...c, id: uuid(), criado_em: agora() };
    store().cards.push(row);
    return clone(row);
  }
  async updateCard(id: string, patch: Partial<Card>) {
    const c = store().cards.find((x) => x.id === id);
    if (!c) return null;
    Object.assign(c, patch, { id: c.id });
    return clone(c);
  }

  // ── Ledger ─────────────────────────────────────────────────
  async applyLedger(input: ApplyLedgerInput): Promise<LedgerEntry> {
    const db = store();
    // Idempotência: referência única
    const existente = db.ledger.find((e) => e.referencia === input.referencia);
    if (existente) return clone(existente);

    const current = db.ledger.reduce((acc, e) => acc + cents(e.valor), 0);
    const novo = current + Math.round(input.valorCents);
    if (Math.round(input.valorCents) < 0 && novo < 0) {
      throw new Error("SALDO_INSUFICIENTE");
    }
    const entry: LedgerEntry = {
      id: uuid(),
      user_id: input.userId,
      tipo: input.tipo,
      valor: fromCents(input.valorCents),
      moeda: input.moeda ?? "USD",
      rate_id: input.rateId ?? null,
      referencia: input.referencia,
      estado: input.estado ?? "confirmado",
      descricao: input.descricao,
      saldo_resultante: fromCents(novo),
      criado_em: agora(),
    };
    db.ledger.push(entry);
    return clone(entry);
  }

  async listLedger(userId: string, opts?: LedgerFilter) {
    let rows = store().ledger.filter((e) => e.user_id === userId);
    if (opts?.tipo && opts.tipo !== "todas") rows = rows.filter((e) => e.tipo === opts.tipo);
    rows = [...rows].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    if (opts?.offset) rows = rows.slice(opts.offset);
    if (opts?.limit) rows = rows.slice(0, opts.limit);
    return cloneList(rows);
  }

  async balanceCents(userId: string) {
    return store().ledger.filter((e) => e.user_id === userId).reduce((acc, e) => acc + cents(e.valor), 0);
  }

  async insertReservation(r: Omit<Reservation, "id" | "criado_em" | "estado">): Promise<Reservation> {
    const row: Reservation = { ...r, id: uuid(), estado: "ativa", criado_em: agora() };
    store().reservations.push(row);
    return clone(row);
  }
  async findReservationByReferencia(referencia: string) {
    const r = store().reservations.find((x) => x.referencia === referencia);
    return r ? clone(r) : null;
  }
  async updateReservation(id: string, patch: Partial<Reservation>) {
    const r = store().reservations.find((x) => x.id === id);
    if (!r) return null;
    Object.assign(r, patch, { id: r.id });
    return clone(r);
  }
  async activeReservationsCents(userId: string) {
    return store().reservations.filter((r) => r.user_id === userId && r.estado === "ativa").reduce((acc, r) => acc + cents(r.valor_usd), 0);
  }

  // ── Depósitos ──────────────────────────────────────────────
  async insertDeposit(d: Omit<Deposit, "id" | "criado_em" | "decidido_em">): Promise<Deposit> {
    const row: Deposit = { ...d, id: uuid(), criado_em: agora(), decidido_em: null };
    store().deposits.push(row);
    return clone(row);
  }
  async findDeposit(id: string) {
    const d = store().deposits.find((x) => x.id === id);
    return d ? clone(d) : null;
  }
  async findDepositByReferencia(referencia: string) {
    const d = store().deposits.find((x) => x.referencia === referencia);
    return d ? clone(d) : null;
  }
  async findDepositByTxCode(codigo: string) {
    const d = store().deposits.find((x) => (x.codigo_tx ?? "").toUpperCase() === codigo.toUpperCase());
    return d ? clone(d) : null;
  }
  async findDepositByProvedorRef(ref: string) {
    const d = store().deposits.find((x) => x.provedor_ref === ref);
    return d ? clone(d) : null;
  }
  async updateDeposit(id: string, patch: Partial<Deposit>) {
    const d = store().deposits.find((x) => x.id === id);
    if (!d) return null;
    Object.assign(d, patch, { id: d.id });
    return clone(d);
  }
  async listDeposits(filter?: DepositFilter) {
    let rows = store().deposits;
    if (filter?.userId) rows = rows.filter((d) => d.user_id === filter.userId);
    if (filter?.estado) rows = rows.filter((d) => d.estado === filter.estado);
    if (filter?.agenteId) rows = rows.filter((d) => d.agent_id === filter.agenteId);
    rows = [...rows].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    if (filter?.limit) rows = rows.slice(0, filter.limit);
    return cloneList(rows);
  }

  // ── Levantamentos ──────────────────────────────────────────
  async insertWithdrawal(w: Omit<Withdrawal, "id" | "criado_em" | "concluida_em">): Promise<Withdrawal> {
    const row: Withdrawal = { ...w, id: uuid(), criado_em: agora(), concluida_em: null };
    store().withdrawals.push(row);
    return clone(row);
  }
  async findWithdrawal(id: string) {
    const w = store().withdrawals.find((x) => x.id === id);
    return w ? clone(w) : null;
  }
  async findWithdrawalByReferencia(referencia: string) {
    const w = store().withdrawals.find((x) => x.referencia === referencia);
    return w ? clone(w) : null;
  }
  async updateWithdrawal(id: string, patch: Partial<Withdrawal>) {
    const w = store().withdrawals.find((x) => x.id === id);
    if (!w) return null;
    Object.assign(w, patch, { id: w.id });
    return clone(w);
  }
  async listWithdrawals(filter?: WithdrawalFilter) {
    let rows = store().withdrawals;
    if (filter?.userId) rows = rows.filter((w) => w.user_id === filter.userId);
    if (filter?.estado) rows = rows.filter((w) => w.estado === filter.estado);
    if (filter?.agenteId) rows = rows.filter((w) => w.agent_id === filter.agenteId);
    rows = [...rows].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    if (filter?.limit) rows = rows.slice(0, filter.limit);
    return cloneList(rows);
  }

  // ── Agentes ────────────────────────────────────────────────
  async insertAgent(a: Omit<Agent, "id" | "criado_em" | "avaliacao_media" | "total_operacoes" | "operacoes_concluidas" | "tempo_resposta_min">): Promise<Agent> {
    const row: Agent = { ...a, id: uuid(), avaliacao_media: 5, total_operacoes: 0, operacoes_concluidas: 0, tempo_resposta_min: 5, criado_em: agora() };
    store().agents.push(row);
    return clone(row);
  }
  async findAgent(id: string) {
    const a = store().agents.find((x) => x.id === id);
    return a ? clone(a) : null;
  }
  async findAgentByUserId(userId: string) {
    const a = store().agents.find((x) => x.user_id === userId);
    return a ? clone(a) : null;
  }
  async findAgentById(id: string) {
    return this.findAgent(id);
  }
  async updateAgent(id: string, patch: Partial<Agent>) {
    const a = store().agents.find((x) => x.id === id);
    if (!a) return null;
    Object.assign(a, patch, { id: a.id });
    return clone(a);
  }
  async listAgents(filter?: { estado?: string }) {
    let rows = store().agents;
    if (filter?.estado) rows = rows.filter((a) => a.estado === filter.estado);
    return cloneList(rows);
  }

  async insertOrder(o: Omit<AgentOrder, "id" | "criado_em" | "aceite_em" | "concluida_em">): Promise<AgentOrder> {
    const row: AgentOrder = { ...o, id: uuid(), criado_em: agora(), aceite_em: null, concluida_em: null };
    store().orders.push(row);
    return clone(row);
  }
  async findOrder(id: string) {
    const o = store().orders.find((x) => x.id === id);
    return o ? clone(o) : null;
  }
  async updateOrder(id: string, patch: Partial<AgentOrder>) {
    const o = store().orders.find((x) => x.id === id);
    if (!o) return null;
    Object.assign(o, patch, { id: o.id });
    return clone(o);
  }
  async listOrders(filter?: OrderFilter) {
    let rows = store().orders;
    if (filter?.agentId) rows = rows.filter((o) => o.agent_id === filter.agentId);
    if (filter?.estado) rows = rows.filter((o) => o.estado === filter.estado);
    if (filter?.tipo) rows = rows.filter((o) => o.tipo === filter.tipo);
    rows = [...rows].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    if (filter?.limit) rows = rows.slice(0, filter.limit);
    return cloneList(rows);
  }

  // ── Taxas, câmbio & definições ─────────────────────────────
  async listRates() {
    return cloneList([...store().rates].sort((a, b) => b.criado_em.localeCompare(a.criado_em)));
  }
  async insertRate(r: Omit<Rate, "id" | "criado_em">): Promise<Rate> {
    const row: Rate = { ...r, id: uuid(), criado_em: agora() };
    store().rates.push(row);
    return clone(row);
  }
  async latestRate(par: string) {
    const rows = store().rates.filter((r) => r.par === par).sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    return rows[0] ? clone(rows[0]) : null;
  }
  async listFees() {
    return cloneList(store().fees);
  }
  async upsertFee(chave: string, valor: number, moeda = "USD", ativo = true): Promise<Fee> {
    const db = store();
    const existing = db.fees.find((f) => f.chave === chave);
    if (existing) {
      existing.valor = valor;
      existing.moeda = moeda;
      existing.ativo = ativo;
      return clone(existing);
    }
    const row: Fee = { id: uuid(), chave, valor, moeda, ativo };
    db.fees.push(row);
    return clone(row);
  }
  async listSettings() {
    return cloneList(store().settings);
  }
  async setSetting(chave: string, valor: string) {
    const db = store();
    const s = db.settings.find((x) => x.chave === chave);
    if (s) s.valor = valor;
    else db.settings.push({ chave, valor });
  }

  // ── Notificações ───────────────────────────────────────────
  async insertNotification(n: Omit<Notification, "id" | "criado_em" | "lido_em">): Promise<Notification> {
    const row: Notification = { ...n, id: uuid(), criado_em: agora(), lido_em: null };
    store().notifications.push(row);
    return clone(row);
  }
  async listNotifications(userId: string, limit?: number) {
    let rows = store().notifications.filter((n) => n.user_id === userId).sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    if (limit) rows = rows.slice(0, limit);
    return cloneList(rows);
  }
  async markNotificationRead(id: string, userId: string) {
    const n = store().notifications.find((x) => x.id === id && x.user_id === userId);
    if (n) {
      n.estado = "lida";
      n.lido_em = agora();
    }
  }
  async markAllNotificationsRead(userId: string) {
    for (const n of store().notifications) {
      if (n.user_id === userId && n.estado !== "lida") {
        n.estado = "lida";
        n.lido_em = agora();
      }
    }
  }
  async listAllNotifications() {
    return cloneList([...store().notifications].sort((a, b) => b.criado_em.localeCompare(a.criado_em)));
  }

  // ── Disputas ───────────────────────────────────────────────
  async insertDispute(d: Omit<Dispute, "id" | "criado_em" | "resolvida_em">): Promise<Dispute> {
    const row: Dispute = { ...d, id: uuid(), criado_em: agora(), resolvida_em: null };
    store().disputes.push(row);
    return clone(row);
  }
  async findDispute(id: string) {
    const d = store().disputes.find((x) => x.id === id);
    return d ? clone(d) : null;
  }
  async updateDispute(id: string, patch: Partial<Dispute>) {
    const d = store().disputes.find((x) => x.id === id);
    if (!d) return null;
    Object.assign(d, patch, { id: d.id });
    return clone(d);
  }
  async listDisputes() {
    return cloneList([...store().disputes].sort((a, b) => b.criado_em.localeCompare(a.criado_em)));
  }

  // ── Auditoria ──────────────────────────────────────────────
  async insertAudit(a: Omit<AuditLog, "id" | "criado_em">) {
    store().audit.push({ ...a, id: uuid(), criado_em: agora() });
  }
  async listAudit(limit = 100) {
    return cloneList([...store().audit].sort((a, b) => b.criado_em.localeCompare(a.criado_em)).slice(0, limit));
  }

  // ── Estatísticas ───────────────────────────────────────────
  async adminStats(): Promise<AdminStats> {
    const db = store();
    const users = db.users;
    const aprovados = db.deposits.filter((d) => d.estado === "aprovado");
    const levantados = db.withdrawals.filter((w) => w.estado === "concluida");
    const volDep = aprovados.reduce((acc, d) => acc + cents(d.valor_liquido_usd ?? d.valor_usd), 0);
    const volLev = levantados.reduce((acc, w) => acc + cents(w.valor_usd), 0);
    const volMpesa = aprovados.filter((d) => d.metodo === "mpesa").reduce((acc, d) => acc + cents(d.valor_liquido_usd ?? d.valor_usd), 0);
    const volEmola = aprovados.filter((d) => d.metodo === "emola").reduce((acc, d) => acc + cents(d.valor_liquido_usd ?? d.valor_usd), 0);
    const volCripto = aprovados.filter((d) => d.metodo === "usdt_trc20").reduce((acc, d) => acc + cents(d.valor_liquido_usd ?? d.valor_usd), 0);
    const comissoes = aprovados.reduce((acc, d) => acc + cents(d.comissao ?? 0) + cents(d.taxa ?? 0), 0);

    // Série diária (últimos 14 dias) de depósitos confirmados no ledger
    const dias: { dia: string; total: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      const total = db.ledger
        .filter((e) => e.tipo === "deposito" && e.criado_em.slice(0, 10) === key)
        .reduce((acc, e) => acc + cents(e.valor), 0);
      dias.push({ dia: day.toLocaleDateString("pt-MZ", { day: "2-digit", month: "short" }), total: fromCents(total) });
    }

    return {
      totalUtilizadores: users.filter((u) => u.papel === "cliente" || u.papel === "agente").length,
      utilizadoresAtivos: users.filter((u) => (u.papel === "cliente" || u.papel === "agente") && u.estado === "ativo").length,
      cartoesEmitidos: db.cards.length,
      cartoesAtivos: db.cards.filter((c) => c.estado === "ativo").length,
      totalDepositadoCents: volDep,
      totalLevantadoCents: volLev,
      volumeMpesaCents: volMpesa,
      volumeEmolaCents: volEmola,
      volumeCriptoCents: volCripto,
      comissoesCents: comissoes,
      depositosPendentes: db.deposits.filter((d) => ["pendente_analise", "aguardando_pagamento", "identificado", "aguardando_confirmacoes"].includes(d.estado)).length,
      levantamentosPendentes: db.withdrawals.filter((w) => ["criada", "aguardando_agente", "atribuida", "em_processamento", "enviada", "aguardando_confirmacao"].includes(w.estado)).length,
      agentesAtivos: db.agents.filter((a) => a.estado === "ativo").length,
      disputasAbertas: db.disputes.filter((d) => d.estado === "aberta" || d.estado === "em_analise").length,
      volumeDiario: dias,
    };
  }
}

export const demoStore = new DemoStore();
void centsToDb;
