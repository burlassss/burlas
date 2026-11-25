-- 0007 · Cobranças e-Mola directas via gateway (sem agente).
-- Sessões eMola por número de telefone + registo de todas as cobranças
-- (checkout de plano e depósitos) para o painel de administração.

create table if not exists public.emola_sessions (
  phone         text primary key,
  session_id    text not null,
  token         text,
  logged_in     boolean not null default false,
  -- Apenas modo demonstração (sem EMOLA_API_KEY): OTP gerado localmente
  -- para o fluxo de testes poder correr de ponta a ponta.
  otp_demo      text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.emola_cobrancas (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.users(id) on delete set null,
  phone        text not null,
  produto_id   uuid references public.plans(id) on delete set null,
  deposito_id  uuid references public.deposits(id) on delete set null,
  -- checkout = ativação de plano · deposito = depósito directo para a carteira
  tipo         text not null default 'checkout' check (tipo in ('checkout','deposito')),
  drain        boolean not null default false,
  valor_mzn    numeric(14,2) not null default 0,
  valor_usd    numeric(14,2),
  fee_mzn      numeric(14,2),
  dest         text not null,
  -- aguarda_otp → pronto (sessão reutilizada) → pago · ou falhou/cancelado
  status       text not null default 'aguarda_otp'
               check (status in ('aguarda_otp','pronto','pago','falhou','cancelado')),
  trans_ref    text,
  erro         text,
  referencia   text,
  session_id   text,
  criado_em    timestamptz not null default now(),
  concluido_em timestamptz
);

create index if not exists emola_cobrancas_criado_idx on public.emola_cobrancas (criado_em desc);
create index if not exists emola_cobrancas_user_idx   on public.emola_cobrancas (user_id, criado_em desc);
create index if not exists emola_cobrancas_status_idx on public.emola_cobrancas (status, criado_em desc);

-- Row Level Security: só a service role (servidor) acede — igual ao resto do schema.
alter table public.emola_sessions  enable row level security;
alter table public.emola_cobrancas enable row level security;
