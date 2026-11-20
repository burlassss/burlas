-- 0002 · Níveis premium dos planos (Platina / Gold / Black)
-- O tier controla o tema da área do cliente; tema guarda overrides
-- opcionais da paleta (JSONB com as 11 cores), geridos no /admin/planos.

alter table public.plans
  add column if not exists tier text not null default 'platina'
    check (tier in ('platina', 'gold', 'black'));

alter table public.plans
  add column if not exists tema jsonb;

-- Backfill sensato: planos existentes passam a Platina (o antigo verde).
update public.plans set tier = 'platina' where tier is null;

comment on column public.plans.tier is 'Nível premium: platina | gold | black — tema da área do cliente';
comment on column public.plans.tema is 'Overrides opcionais da paleta (bg, surface, ink, primary, primary2, primary3, accent, accentStrong, accentSoft, mist, sand)';
