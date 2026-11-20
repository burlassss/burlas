-- 0004 · Onboarding (perguntas iniciais) e KYC
create table if not exists public.onboarding_answers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  usos          text[] not null default '{}',
  metodos_antes text[] not null default '{}',
  criado_em     timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.kyc_submissions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  tipo_documento   text not null check (tipo_documento in ('bi','passaporte','carta_conducao')),
  numero_documento text not null,
  frente_url       text,
  verso_url        text,
  selfie_url       text,
  estado           text not null default 'pendente' check (estado in ('pendente','aprovada','rejeitada')),
  motivo_recusa    text,
  criado_em        timestamptz not null default now(),
  decidido_em      timestamptz,
  decidido_por     uuid references public.users(id)
);
create index if not exists kyc_submissions_user_idx on public.kyc_submissions(user_id, criado_em desc);
create index if not exists kyc_submissions_estado_idx on public.kyc_submissions(estado, criado_em desc);

alter table public.onboarding_answers enable row level security;
alter table public.kyc_submissions    enable row level security;

-- Limites KYC (config via settings)
insert into public.settings (chave, valor) values
  ('kyc_limite_nao_verificado_usd', '2000'),
  ('kyc_limite_verificado_usd', '5000')
on conflict (chave) do nothing;
