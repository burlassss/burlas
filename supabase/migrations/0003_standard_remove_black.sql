-- 0003 · Standard (verde original) e remoção do nível Black
-- 0002 criado antes da decisão de produto. Correção de dados + constraint.

-- Garante colunas (caso 0002 ainda não tenha sido aplicada)
alter table public.plans
  add column if not exists tier text not null default 'standard';
alter table public.plans
  add column if not exists tema jsonb;

-- Black → Platina (o nível premium claro)
update public.plans set tier = 'platina' where tier = 'black';

-- Substitui o check constraint do tier (o de 0002 admitia 'black')
do $$
declare c text;
begin
  select conname into c
  from pg_constraint
  where conrelid = 'public.plans'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%tier%';
  if c is not null then
    execute format('alter table public.plans drop constraint %I', c);
  end if;
end $$;
alter table public.plans
  add constraint plans_tier_check check (tier in ('standard', 'platina', 'gold'));
alter table public.plans alter column tier set default 'standard';

comment on column public.plans.tier is 'Nível premium: standard (verde original) | platina | gold — tema da área do cliente';
