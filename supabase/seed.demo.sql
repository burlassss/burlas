-- ─────────────────────────────────────────────────────────────
-- MOZOUT-USD — Seed de AVALIAÇÃO (opcional, NUNCA em produção)
-- Executar APÓS 0001_init.sql e seed.sql.
-- Cria contas zeradas (sem movimentos, sem saldo, sem histórico):
--   admin@mozout.co.mz        → Mozout#Admin2026   (superadmin)
--   agente.mpesa@example.com  → Agente#123         (agente M-Pesa)
--   agente.emola@example.com  → Agente#123         (agente e-Mola)
-- Passwords públicas — alterar ou apagar após avaliação.
-- ─────────────────────────────────────────────────────────────

insert into public.users (nome, email, telefone, nascimento, password_hash, estado, telefone_verificado, papel) values
('Administrador Geral','admin@mozout.co.mz','+258840000001','1990-01-01','$2b$10$hnustEdJPuGwTcX.d1Vk8.UeEsQ4HOeGz9x9teVbYIIp5taIpm5V2','ativo',true,'superadmin'),
('Agente M-Pesa (avaliação)','agente.mpesa@example.com','+258842468135','1990-01-01','$2b$10$DP4sQDSKlr1Lj5X0S65S8.6VfJWNlust3.H5I4WIw58pb2rx65iYi','ativo',true,'agente'),
('Agente e-Mola (avaliação)','agente.emola@example.com','+258863579246','1990-01-01','$2b$10$DP4sQDSKlr1Lj5X0S65S8.6VfJWNlust3.H5I4WIw58pb2rx65iYi','ativo',true,'agente')
on conflict (email) do nothing;

insert into public.agents (user_id, operadora, limite_diario, disponivel, comissao_pct, estado, avaliacao_media, total_operacoes, operacoes_concluidas, tempo_resposta_min, localizacao)
select id, 'mpesa', 1000, true, 1.0, 'ativo', 0, 0, 0, 5, null from public.users where email = 'agente.mpesa@example.com'
on conflict (user_id) do nothing;

insert into public.agents (user_id, operadora, limite_diario, disponivel, comissao_pct, estado, avaliacao_media, total_operacoes, operacoes_concluidas, tempo_resposta_min, localizacao)
select id, 'emola', 1000, true, 1.0, 'ativo', 0, 0, 0, 5, null from public.users where email = 'agente.emola@example.com'
on conflict (user_id) do nothing;
