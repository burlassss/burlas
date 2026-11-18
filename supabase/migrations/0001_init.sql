-- ─────────────────────────────────────────────────────────────
-- MOZOUT-USD — Migração inicial (0001_init)
-- Ledger imutável, atomicidade e idempotência por referência.
-- Aplicar com: supabase db push  (ou colar no SQL Editor do Supabase)
-- ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── UTILIZADORES & SESSÕES ────────────────────────────────────
create table if not exists public.users (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null,
  email              text not null unique,
  telefone           text not null unique,
  nascimento         date not null,
  password_hash      text not null,
  estado             text not null default 'pendente' check (estado in ('pendente','ativo','suspenso','bloqueado')),
  telefone_verificado boolean not null default false,
  papel              text not null default 'cliente' check (papel in ('cliente','agente','admin','superadmin','suporte','financeiro','gestor_agentes','auditor')),
  criado_em          timestamptz not null default now()
);

create table if not exists public.sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expira_em  timestamptz not null,
  ip         text,
  user_agent text,
  criado_em  timestamptz not null default now()
);
create index if not exists sessions_user_idx on public.sessions(user_id);
create index if not exists sessions_expira_idx on public.sessions(expira_em);

create table if not exists public.sms_codes (
  id             uuid primary key default gen_random_uuid(),
  telefone       text not null,
  codigo_hash    text not null,
  proposito      text not null default 'registo',
  tentativas     int not null default 0,
  expira_em      timestamptz not null,
  verificado_em  timestamptz,
  criado_em      timestamptz not null default now()
);
create index if not exists sms_codes_tel_idx on public.sms_codes(telefone, proposito, criado_em desc);

-- ── PLANOS & CARTÕES ──────────────────────────────────────────
create table if not exists public.plans (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null,
  slug               text not null unique,
  tipo               text not null check (tipo in ('compras','assinaturas','viagem')),
  descricao          text not null default '',
  imagem             text,
  moedas             text[] not null default '{USD}',
  taxa_ativacao_usd  numeric(14,2) not null default 0,
  mensalidade_usd    numeric(14,2) not null default 0,
  limite_gasto_usd   numeric(14,2) not null default 1000,
  limite_carga_usd   numeric(14,2) not null default 2000,
  validade_meses     int not null default 36,
  ordem              int not null default 0,
  ativo              boolean not null default true,
  destaque           boolean not null default false,
  cor                text not null default 'from-[#101f16] via-[#173a29] to-[#0b241a]',
  icone              text not null default 'shopping-bag',
  beneficios         jsonb not null default '[]'::jsonb,
  criado_em          timestamptz not null default now()
);

create table if not exists public.cards (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  plan_id       uuid not null references public.plans(id),
  numero        text not null, -- cifrado com AES-256-GCM (APP_SECRET)
  validade      text not null,
  cvv           text not null, -- cifrado
  titular       text not null,
  estado        text not null default 'ativo' check (estado in ('ativo','congelado','cancelado','pendente')),
  limite_mensal numeric(14,2) not null default 1000,
  criado_em     timestamptz not null default now()
);
create index if not exists cards_user_idx on public.cards(user_id);

-- ── TAXAS / COTAÇÕES (antes do ledger, por FK) ────────────────
create table if not exists public.rates (
  id         uuid primary key default gen_random_uuid(),
  par        text not null,
  valor      numeric(14,6) not null,
  margem     numeric(6,3) not null default 1.5,
  criado_por uuid references public.users(id),
  criado_em  timestamptz not null default now()
);
create index if not exists rates_par_idx on public.rates(par, criado_em desc);

create table if not exists public.fees (
  id     uuid primary key default gen_random_uuid(),
  chave  text not null unique,
  valor  numeric(14,4) not null,
  moeda  text not null default 'USD',
  ativo  boolean not null default true
);

-- ── LEDGER FINANCEIRO (fonte de verdade, imutável) ────────────
create table if not exists public.ledger_entries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  tipo             text not null check (tipo in ('deposito','levantamento','compra','taxa','reembolso','ajuste','ativacao_cartao','mensalidade','comissao','estorno')),
  valor            numeric(14,2) not null, -- assinado
  moeda            text not null default 'USD',
  rate_id          uuid references public.rates(id),
  referencia       text not null unique,   -- chave de idempotência
  estado           text not null default 'confirmado' check (estado in ('pendente','confirmado','estornado')),
  descricao        text not null default '',
  saldo_resultante numeric(14,2) not null,
  criado_em        timestamptz not null default now()
);
create index if not exists ledger_user_idx on public.ledger_entries(user_id, criado_em desc);
create index if not exists ledger_tipo_idx on public.ledger_entries(tipo);

-- Imutabilidade: proíbe UPDATE/DELETE no ledger
create or replace function public.ledger_imutavel() returns trigger
language plpgsql as $$
begin
  raise exception 'ledger_entries é imutável — use lançamentos de estorno/ajuste';
end $$;

drop trigger if exists ledger_no_update on public.ledger_entries;
create trigger ledger_no_update before update or delete on public.ledger_entries
  for each row execute function public.ledger_imutavel();

create table if not exists public.reservations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  valor_usd  numeric(14,2) not null check (valor_usd >= 0),
  referencia text not null unique,
  estado     text not null default 'ativa' check (estado in ('ativa','consumida','cancelada')),
  criado_em  timestamptz not null default now()
);
create index if not exists reservations_user_idx on public.reservations(user_id, estado);

-- ── AGENTES (antes dos depósitos, por FK) ─────────────────────
create table if not exists public.agents (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique references public.users(id) on delete cascade,
  operadora            text not null check (operadora in ('mpesa','emola','ambas')),
  limite_diario        numeric(14,2) not null default 1000,
  disponivel           boolean not null default true,
  comissao_pct         numeric(6,3) not null default 1.0,
  estado               text not null default 'pendente' check (estado in ('pendente','ativo','suspenso','inativo')),
  avaliacao_media      numeric(3,2) not null default 5.0,
  total_operacoes      int not null default 0,
  operacoes_concluidas int not null default 0,
  tempo_resposta_min   int not null default 5,
  localizacao          text,
  criado_em            timestamptz not null default now()
);

-- ── DEPÓSITOS ─────────────────────────────────────────────────
create table if not exists public.deposits (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  metodo             text not null check (metodo in ('usdt_trc20','mpesa','emola')),
  valor_mzn          numeric(14,2),
  valor_usd          numeric(14,2) not null,
  valor_liquido_usd  numeric(14,2),
  codigo_tx          text,
  rate_id            uuid references public.rates(id),
  comissao           numeric(14,2) not null default 0,
  taxa               numeric(14,2) not null default 0,
  agent_id           uuid references public.agents(id),
  estado             text not null default 'aguardando_pagamento' check (estado in ('aguardando_pagamento','identificado','aguardando_confirmacoes','pendente_analise','aprovado','recusado','expirado','falhou','reembolsado')),
  motivo_recusa      text,
  referencia         text not null unique,
  provedor_ref       text,
  endereco_pagamento text,
  criado_em          timestamptz not null default now(),
  decidido_em        timestamptz
);
create unique index if not exists deposits_codigo_tx_uidx on public.deposits(codigo_tx) where codigo_tx is not null;
create index if not exists deposits_user_idx on public.deposits(user_id, criado_em desc);
create index if not exists deposits_estado_idx on public.deposits(estado);

-- ── LEVANTAMENTOS ─────────────────────────────────────────────
create table if not exists public.withdrawals (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  metodo             text not null check (metodo in ('mpesa','emola','usdt_trc20')),
  valor_usd          numeric(14,2) not null,
  valor_mzn          numeric(14,2),
  valor_liquido_mzn  numeric(14,2),
  taxa               numeric(14,2) not null default 0,
  comissao           numeric(14,2) not null default 0,
  destino            text not null,
  rate_id            uuid references public.rates(id),
  agent_id           uuid references public.agents(id),
  referencia         text not null unique,
  codigo_tx          text,
  estado             text not null default 'criada' check (estado in ('criada','aguardando_agente','atribuida','em_processamento','enviada','aguardando_confirmacao','concluida','cancelada','em_disputa')),
  observacoes        text,
  criado_em          timestamptz not null default now(),
  concluida_em       timestamptz
);
create index if not exists withdrawals_user_idx on public.withdrawals(user_id, criado_em desc);
create index if not exists withdrawals_estado_idx on public.withdrawals(estado);

-- ── ORDENS DE AGENTES ─────────────────────────────────────────
create table if not exists public.agent_orders (
  id            uuid primary key default gen_random_uuid(),
  agent_id      uuid not null references public.agents(id) on delete cascade,
  tipo          text not null check (tipo in ('deposito','levantamento')),
  referencia_id uuid not null,
  estado        text not null default 'pendente' check (estado in ('pendente','aceite','recusada','concluida','expirada','cancelada','em_disputa')),
  expira_em     timestamptz not null,
  criado_em     timestamptz not null default now(),
  aceite_em     timestamptz,
  concluida_em  timestamptz
);
create index if not exists orders_agent_idx on public.agent_orders(agent_id, estado);
create unique index if not exists orders_ref_uidx on public.agent_orders(tipo, referencia_id, agent_id);

-- ── DISPUTAS ──────────────────────────────────────────────────
create table if not exists public.disputes (
  id            uuid primary key default gen_random_uuid(),
  referencia_id uuid,
  tipo          text not null,
  user_id       uuid not null references public.users(id) on delete cascade,
  agent_id      uuid references public.agents(id),
  estado        text not null default 'aberta' check (estado in ('aberta','em_analise','resolvida','recusada')),
  resolucao     text,
  detalhes      text,
  criado_em     timestamptz not null default now(),
  resolvida_em  timestamptz
);
create index if not exists disputes_estado_idx on public.disputes(estado);

-- ── NOTIFICAÇÕES ──────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  tipo       text not null,
  canal      text not null default 'in_app' check (canal in ('in_app','sms')),
  titulo     text not null,
  corpo      text not null default '',
  estado     text not null default 'enviada' check (estado in ('pendente','enviada','falhou','lida')),
  lido_em    timestamptz,
  criado_em  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, criado_em desc);

-- ── AUDITORIA ─────────────────────────────────────────────────
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  ator        uuid references public.users(id),
  acao        text not null,
  entidade    text not null,
  entidade_id text,
  dados       jsonb,
  criado_em   timestamptz not null default now()
);
create index if not exists audit_criado_idx on public.audit_log(criado_em desc);

-- ── SETTINGS ──────────────────────────────────────────────────
create table if not exists public.settings (
  chave text primary key,
  valor text not null
);

-- ─────────────────────────────────────────────────────────────
-- apply_ledger — escrita financeira ATÓMICA e IDEMPOTENTE
--  · Lock na linha do utilizador → serializa lançamentos concorrentes
--  · referencia UNIQUE → nunca credita/debita duas vezes
--  · saldo nunca fica negativo sem autorização
-- ─────────────────────────────────────────────────────────────
create or replace function public.apply_ledger(
  p_user_id    uuid,
  p_tipo       text,
  p_valor      numeric,
  p_moeda      text,
  p_referencia text,
  p_descricao  text,
  p_estado     text,
  p_rate_id    uuid default null
) returns public.ledger_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current numeric(14,2);
  v_new     numeric(14,2);
  v_entry   public.ledger_entries;
begin
  -- Idempotência: devolve o lançamento existente se a referência repetir
  select * into v_entry from public.ledger_entries where referencia = p_referencia;
  if found then
    return v_entry;
  end if;

  -- Série de lançamentos do utilizador (lock pessimista)
  perform 1 from public.users where id = p_user_id for update;

  select coalesce(sum(valor), 0) into v_current
    from public.ledger_entries where user_id = p_user_id;

  v_new := v_current + p_valor;
  if p_valor < 0 and v_new < 0 then
    raise exception 'SALDO_INSUFICIENTE';
  end if;

  insert into public.ledger_entries
    (user_id, tipo, valor, moeda, rate_id, referencia, estado, descricao, saldo_resultante)
  values
    (p_user_id, p_tipo, p_valor, coalesce(p_moeda,'USD'), p_rate_id, p_referencia, coalesce(p_estado,'confirmado'), p_descricao, v_new)
  returning * into v_entry;

  return v_entry;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security: a app usa SERVICE ROLE no servidor.
-- Bloqueamos acesso anónimo/autenticado direto às tabelas.
-- ─────────────────────────────────────────────────────────────
alter table public.users          enable row level security;
alter table public.sessions       enable row level security;
alter table public.sms_codes      enable row level security;
alter table public.plans          enable row level security;
alter table public.cards          enable row level security;
alter table public.rates          enable row level security;
alter table public.fees           enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.reservations   enable row level security;
alter table public.agents         enable row level security;
alter table public.deposits       enable row level security;
alter table public.withdrawals    enable row level security;
alter table public.agent_orders   enable row level security;
alter table public.disputes       enable row level security;
alter table public.notifications  enable row level security;
alter table public.audit_log      enable row level security;
alter table public.settings       enable row level security;
-- Sem policies: apenas a service role (servidor) acede. Nunca o browser.
