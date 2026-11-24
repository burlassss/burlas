-- 0006 · Números de recebimento específicos por método para cada agente.
-- Aplicar em produção antes de ativar a nova gestão dos números.
alter table public.agents
  add column if not exists telefone_mpesa text,
  add column if not exists telefone_emola text;

-- Preenche os números históricos com o telefone de conta para os métodos
-- que o agente já declarou operar. Agentes "ambas" terão de confirmar/corrigir
-- cada carteira no painel antes de receber novas ordens.
update public.agents a
set telefone_mpesa = u.telefone
from public.users u
where u.id = a.user_id
  and a.operadora = 'mpesa'
  and a.telefone_mpesa is null;

update public.agents a
set telefone_emola = u.telefone
from public.users u
where u.id = a.user_id
  and a.operadora = 'emola'
  and a.telefone_emola is null;
