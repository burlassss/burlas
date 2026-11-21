-- 0005 · Dados pessoais declarados na verificação de identidade
-- Aplicar apenas após aprovação explícita do responsável de produção.
alter table public.kyc_submissions
  add column if not exists nome_completo text,
  add column if not exists data_nascimento date;
