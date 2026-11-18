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
import { centsToDb, dbToCents, fromCents, referencia } from "../money";
import { gerarNumeroCartao } from "../luhn";
import { encryptSecret } from "../crypto";

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
const isoEm = (minutos: number) => new Date(Date.now() + minutos * 60_000).toISOString();
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
  const admin = u({ nome: "Administrador Geral", email: "admin@mozout.co.mz", telefone: "+258840000001", nascimento: "1990-01-01", password: "Mozout#Admin2026", estado: "ativo", telefone_verificado: true, papel: "superadmin" });
  const suporte = u({ nome: "Equipa de Suporte", email: "suporte@mozout.co.mz", telefone: "+258840000002", nascimento: "1993-05-11", password: "Mozout#Suporte2026", estado: "ativo", telefone_verificado: true, papel: "suporte" });
  const maria = u({ nome: "Maria Fernandes", email: "maria@example.com", telefone: "+258841234567", nascimento: "1996-03-22", password: "Cliente#123", estado: "ativo", telefone_verificado: true, papel: "cliente" });
  const joao = u({ nome: "João Machava", email: "joao@example.com", telefone: "+258857654321", nascimento: "2001-07-30", password: "Cliente#123", estado: "ativo", telefone_verificado: true, papel: "cliente" });
  const agenteMpesaUser = u({ nome: "Celso Mondlane", email: "agente.mpesa@example.com", telefone: "+258842468135", nascimento: "1988-11-05", password: "Agente#123", estado: "ativo", telefone_verificado: true, papel: "agente" });
  const agenteEmolaUser = u({ nome: "Berta Tembe", email: "agente.emola@example.com", telefone: "+258863579246", nascimento: "1991-02-14", password: "Agente#123", estado: "ativo", telefone_verificado: true, papel: "agente" });

  const plans: Plan[] = [
    {
      id: uuid(), nome: "Compras Online", slug: "compras-online", tipo: "compras",
      descricao: "Para lojas internacionais, e-commerce e serviços digitais. Ideal para Amazon, AliExpress, Shein e subscrições avulsas.",
      imagem: null, moedas: ["USD", "EUR", "GBP"], taxa_ativacao_usd: 10, mensalidade_usd: 2.5,
      limite_gasto_usd: 2000, limite_carga_usd: 5000, validade_meses: 36, ordem: 1, ativo: true, destaque: true,
      cor: "from-[#101f16] via-[#173a29] to-[#0b241a]", icone: "shopping-bag",
      beneficios: ["Aceite em milhões de lojas online", "3-D Secure e alertas em tempo real", "Congelar e descongelar quando quiseres", "CVV dinâmico por compra"],
      criado_em: isoHa(60 * 24 * 200),
    },
    {
      id: uuid(), nome: "Assinaturas", slug: "assinaturas", tipo: "assinaturas",
      descricao: "Feito para pagamentos recorrentes: streaming, ferramentas de IA, software, publicidade e alojamento.",
      imagem: null, moedas: ["USD", "EUR"], taxa_ativacao_usd: 5, mensalidade_usd: 1.5,
      limite_gasto_usd: 1000, limite_carga_usd: 3000, validade_meses: 24, ordem: 2, ativo: true, destaque: false,
      cor: "from-[#141425] via-[#232147] to-[#0e0e20]", icone: "repeat",
      beneficios: ["Ideal para Netflix, Spotify, OpenAI, Google Ads", "Débito recorrente sem fricção", "Limites por comerciante configuráveis", "Reembolso automático de cobranças indevidas"],
      criado_em: isoHa(60 * 24 * 200),
    },
    {
      id: uuid(), nome: "Viagem", slug: "viagem", tipo: "viagem",
      descricao: "Pagamentos em deslocação internacional: hotéis, voos, restaurantes e compras fora de Moçambique.",
      imagem: null, moedas: ["USD", "EUR", "GBP", "ZAR", "AOA"], taxa_ativacao_usd: 15, mensalidade_usd: 0,
      limite_gasto_usd: 5000, limite_carga_usd: 10000, validade_meses: 60, ordem: 3, ativo: true, destaque: false,
      cor: "from-[#1c130b] via-[#3a2712] to-[#241408]", icone: "plane",
      beneficios: ["Sem mensalidade para sempre", "Multi-moeda na mesma carteira", "Cobertura internacional completa", "Seguro de compra incluído"],
      criado_em: isoHa(60 * 24 * 200),
    },
  ];

  const planCompras = plans[0];

  const agents: Agent[] = [
    { id: uuid(), user_id: agenteMpesaUser.id, operadora: "mpesa", limite_diario: 2500, disponivel: true, comissao_pct: 1.0, estado: "ativo", avaliacao_media: 4.8, total_operacoes: 1243, operacoes_concluidas: 1201, tempo_resposta_min: 4, localizacao: "Maputo — Baixa", criado_em: isoHa(60 * 24 * 160) },
    { id: uuid(), user_id: agenteEmolaUser.id, operadora: "emola", limite_diario: 2000, disponivel: true, comissao_pct: 1.0, estado: "ativo", avaliacao_media: 4.6, total_operacoes: 874, operacoes_concluidas: 831, tempo_resposta_min: 6, localizacao: "Matola — Fomento", criado_em: isoHa(60 * 24 * 140) },
  ];

  const rates: Rate[] = [
    { id: uuid(), par: "USD/MZN", valor: 63.8, margem: 1.5, criado_por: admin.id, criado_em: isoHa(60 * 5) },
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

  const data: DBData = {
    users: [admin, suporte, maria, joao, agenteMpesaUser, agenteEmolaUser],
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

  // ── Lançamentos históricos da Maria (fonte de verdade do saldo) ──
  const ap = (input: Omit<ApplyLedgerInput, "referencia"> & { referencia: string }, minutosAtras: number) => {
    const current = data.ledger.reduce((acc, e) => acc + dbToCents(e.valor), 0);
    const novo = current + input.valorCents;
    data.ledger.push({
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
      criado_em: isoHa(minutosAtras),
    });
  };

  ap({ userId: maria.id, tipo: "deposito", valorCents: 50000, referencia: "SEED-DEP-001", descricao: "Depósito USDT TRC20" }, 60 * 24 * 60);
  ap({ userId: maria.id, tipo: "ativacao_cartao", valorCents: -1000, referencia: "SEED-CARD-001", descricao: "Ativação do cartão Compras Online", rateId: null }, 60 * 24 * 59);
  ap({ userId: maria.id, tipo: "deposito", valorCents: 75000, referencia: "SEED-DEP-002", descricao: "Depósito M-Pesa · via Celso Mondlane" }, 60 * 24 * 30);
  ap({ userId: maria.id, tipo: "compra", valorCents: -12999, referencia: "SEED-BUY-001", descricao: "NETFLIX.COM 866-579-7172" }, 60 * 24 * 21);
  ap({ userId: maria.id, tipo: "taxa", valorCents: -250, referencia: "SEED-FEE-001", descricao: "Taxa de levantamento" }, 60 * 24 * 20);
  ap({ userId: maria.id, tipo: "compra", valorCents: -5998, referencia: "SEED-BUY-002", descricao: "SPOTIFY AB" }, 60 * 24 * 12);
  ap({ userId: maria.id, tipo: "reembolso", valorCents: 5998, referencia: "SEED-REF-001", descricao: "Estorno — compra recusada SPOTIFY AB" }, 60 * 24 * 11);
  ap({ userId: maria.id, tipo: "compra", valorCents: -25000, referencia: "SEED-BUY-003", descricao: "AMAZON MARKETPLACE" }, 60 * 24 * 6);
  ap({ userId: maria.id, tipo: "mensalidade", valorCents: -250, referencia: "SEED-FEE-002", descricao: "Mensalidade do cartão Compras Online" }, 60 * 24 * 2);
  ap({ userId: maria.id, tipo: "deposito", valorCents: 12000, referencia: "SEED-DEP-003", descricao: "Depósito e-Mola · via Berta Tembe" }, 60 * 8);

  ap({ userId: joao.id, tipo: "deposito", valorCents: 20000, referencia: "SEED-DEP-J001", descricao: "Depósito USDT TRC20" }, 60 * 24 * 10);
  ap({ userId: joao.id, tipo: "ativacao_cartao", valorCents: -500, referencia: "SEED-CARD-J001", descricao: "Ativação do cartão Assinaturas" }, 60 * 24 * 9);

  // ── Cartão da Maria ────────────────────────────────────────
  const numeroMaria = gerarNumeroCartao("4539");
  data.cards.push({
    id: uuid(), user_id: maria.id, plan_id: planCompras.id,
    numero: encryptSecret(numeroMaria), validade: "09/29", cvv: encryptSecret(String(Math.floor(100 + Math.random() * 900))),
    titular: maria.nome.toUpperCase(), estado: "ativo", limite_mensal: planCompras.limite_gasto_usd, criado_em: isoHa(60 * 24 * 59),
  });

  // ── Depósito pendente em análise (admin) ───────────────────
  const depPendente: Deposit = {
    id: uuid(), user_id: joao.id, metodo: "mpesa", valor_mzn: 32000, valor_usd: 500, valor_liquido_usd: 492.5,
    codigo_tx: "MP2411XK92", rate_id: rates[0].id, comissao: 5, taxa: 2.5, agent_id: agents[0].id,
    estado: "pendente_analise", motivo_recusa: null, referencia: "DEP-M2411XK9", provedor_ref: null, endereco_pagamento: null,
    criado_em: isoHa(38), decidido_em: null,
  };
  data.deposits.push(depPendente);

  const depCrypto: Deposit = {
    id: uuid(), user_id: maria.id, metodo: "usdt_trc20", valor_mzn: null, valor_usd: 250, valor_liquido_usd: 248.75,
    codigo_tx: null, rate_id: null, comissao: 0, taxa: 1.25, agent_id: null,
    estado: "aguardando_pagamento", motivo_recusa: null, referencia: "DEP-T2411C71", provedor_ref: "demo-nowpayments-7712", endereco_pagamento: "TXYZDEMOMOZOUT7RC2025COPA9KQ3LM2",
    criado_em: isoHa(12), decidido_em: null,
  };
  data.deposits.push(depCrypto);

  // ── Levantamento pendente de confirmação ───────────────────
  const lev1: Withdrawal = {
    id: uuid(), user_id: maria.id, metodo: "mpesa", valor_usd: 100, valor_mzn: 6380, valor_liquido_mzn: 6338,
    taxa: 2.5, comissao: 1, destino: "+258841234567", rate_id: rates[0].id, agent_id: agents[0].id,
    referencia: "LEV-M2411QW3", codigo_tx: "MP77451ZX", estado: "aguardando_confirmacao", observacoes: null,
    criado_em: isoHa(95), concluida_em: null,
  };
  data.withdrawals.push(lev1);

  // ── Ordens pendentes para o agente M-Pesa ──────────────────
  data.orders.push(
    { id: uuid(), agent_id: agents[0].id, tipo: "deposito", referencia_id: depPendente.id, estado: "pendente", expira_em: isoEm(15), criado_em: isoHa(38), aceite_em: null, concluida_em: null },
    { id: uuid(), agent_id: agents[0].id, tipo: "levantamento", referencia_id: lev1.id, estado: "aceite", expira_em: isoEm(45), criado_em: isoHa(100), aceite_em: isoHa(96), concluida_em: null },
  );

  // ── Notificações da Maria ──────────────────────────────────
  const notif = (tipo: string, titulo: string, corpo: string, canal: Notification["canal"], minutosAtras: number, lida = false): Notification => ({
    id: uuid(), user_id: maria.id, tipo, canal, titulo, corpo,
    estado: lida ? "lida" : canal === "sms" ? "enviada" : "enviada",
    criado_em: isoHa(minutosAtras), lido_em: lida ? isoHa(minutosAtras - 2) : null,
  });
  data.notifications.push(
    notif("deposito_aprovado", "Depósito aprovado", "O teu depósito de $120.00 via e-Mola foi confirmado e creditado na carteira.", "in_app", 60 * 8),
    notif("cartao_emitido", "Cartão Compras Online ativo", "O teu cartão virtual foi emitido e já pode ser usado em compras internacionais.", "in_app", 60 * 24 * 59, true),
    notif("seguranca", "Novo dispositivo detetado", "Iniciaste sessão num novo dispositivo Android em Maputo. Se não foste tu, altera a tua palavra-passe.", "in_app", 60 * 26),
    notif("codigo_verificacao", "Código de verificação", "O teu código MOZOUT é 482913. Expira em 5 minutos.", "sms", 60 * 24 * 190, true),
    notif("levantamento_concluido", "Levantamento $100 em curso", "O agente Celso enviou MT 6 338 para o teu M-Pesa. Confirma a receção na app.", "in_app", 95),
  );

  // ── Disputa aberta ─────────────────────────────────────────
  data.disputes.push({
    id: uuid(), referencia_id: lev1.id, tipo: "levantamento_nao_recebido", user_id: maria.id, agent_id: agents[0].id,
    estado: "aberta", resolucao: null, detalhes: "O agente marcou como enviado mas o M-Pesa não recebeu a transferência.", criado_em: isoHa(30), resolvida_em: null,
  });

  // ── Auditoria inicial ──────────────────────────────────────
  data.audit.push(
    { id: uuid(), ator: admin.id, acao: "taxa.alterada", entidade: "fees", entidade_id: null, dados: { chave: "deposito_mpesa_pct", valor: 1.5 }, criado_em: isoHa(60 * 5) },
    { id: uuid(), ator: null, acao: "deposito.criado", entidade: "deposits", entidade_id: depCrypto.id, dados: { metodo: "usdt_trc20", valor: 250 }, criado_em: isoHa(12) },
  );

  return data;
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
