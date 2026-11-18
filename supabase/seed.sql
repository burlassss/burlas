-- ─────────────────────────────────────────────────────────────
-- MOZOUT-USD — Seeds (executar APÓS 0001_init.sql)
-- Conteúdo: planos, taxas, cotação, definições e contas de demonstração.
-- Passwords de demonstração (alterar em produção!):
--   admin@mozout.co.mz        → Mozout#Admin2026   (superadmin)
--   suporte@mozout.co.mz      → Mozout#Suporte2026 (suporte)
--   maria@example.com         → Cliente#123        (cliente)
--   joao@example.com          → Cliente#123        (cliente)
--   agente.mpesa@example.com  → Agente#123         (agente M-Pesa)
--   agente.emola@example.com  → Agente#123         (agente e-Mola)
-- ─────────────────────────────────────────────────────────────

insert into public.plans (nome, slug, tipo, descricao, moedas, taxa_ativacao_usd, mensalidade_usd, limite_gasto_usd, limite_carga_usd, validade_meses, ordem, ativo, destaque, cor, icone, beneficios) values
('Compras Online','compras-online','compras','Para lojas internacionais, e-commerce e serviços digitais. Ideal para Amazon, AliExpress, Shein e subscrições avulsas.','{USD,EUR,GBP}',10,2.50,2000,5000,36,1,true,true,'from-[#101f16] via-[#173a29] to-[#0b241a]','shopping-bag','["Aceite em milhões de lojas online","3-D Secure e alertas em tempo real","Congelar e descongelar quando quiseres","CVV dinâmico por compra"]'),
('Assinaturas','assinaturas','assinaturas','Feito para pagamentos recorrentes: streaming, ferramentas de IA, software, publicidade e alojamento.','{USD,EUR}',5,1.50,1000,3000,24,2,true,false,'from-[#141425] via-[#232147] to-[#0e0e20]','repeat','["Ideal para Netflix, Spotify, OpenAI, Google Ads","Débito recorrente sem fricção","Limites por comerciante configuráveis","Reembolso automático de cobranças indevidas"]'),
('Viagem','viagem','viagem','Pagamentos em deslocação internacional: hotéis, voos, restaurantes e compras fora de Moçambique.','{USD,EUR,GBP,ZAR,AOA}',15,0,5000,10000,60,3,true,false,'from-[#1c130b] via-[#3a2712] to-[#241408]','plane','["Sem mensalidade para sempre","Multi-moeda na mesma carteira","Cobertura internacional completa","Seguro de compra incluído"]')
on conflict (slug) do nothing;

insert into public.fees (chave, valor, moeda, ativo) values
('deposito_mpesa_pct', 1.5, 'MZN', true),
('deposito_emola_pct', 1.5, 'MZN', true),
('deposito_usdt_pct', 0.5, 'USDT', true),
('levantamento_mpesa_usd', 2.50, 'USD', true),
('levantamento_emola_usd', 2.50, 'USD', true),
('levantamento_usdt_usd', 1.50, 'USD', true),
('comissao_agente_pct', 1.0, 'USD', true),
('cambio_margem_pct', 1.5, 'MZN', true)
on conflict (chave) do nothing;

insert into public.rates (par, valor, margem) values ('USD/MZN', 63.8, 1.5);

insert into public.settings (chave, valor) values
('plataforma_nome', 'MOZOUT-USD'),
('suporte_email', 'suporte@mozout.co.mz'),
('manutencao', 'false'),
('limite_deposito_dia_usd', '5000'),
('limite_levantamento_dia_usd', '3000')
on conflict (chave) do nothing;

-- Contas de demonstração (passwords já com hash bcrypt)
insert into public.users (nome, email, telefone, nascimento, password_hash, estado, telefone_verificado, papel) values
('Administrador Geral','admin@mozout.co.mz','+258840000001','1990-01-01','$2b$10$hnustEdJPuGwTcX.d1Vk8.UeEsQ4HOeGz9x9teVbYIIp5taIpm5V2','ativo',true,'superadmin'),
('Equipa de Suporte','suporte@mozout.co.mz','+258840000002','1993-05-11','$2b$10$eNP9iTGMF1VkLObXvWos5OOudm8ajb02jg0MbUvYiOlHihm.qZXIa','ativo',true,'suporte'),
('Maria Fernandes','maria@example.com','+258841234567','1996-03-22','$2b$10$HcS4XbjRgYUogVhIbWDcqOUoWUCSjdpsTjQKKqb18GZfCRZLWa..e','ativo',true,'cliente'),
('João Machava','joao@example.com','+258857654321','2001-07-30','$2b$10$HcS4XbjRgYUogVhIbWDcqOUoWUCSjdpsTjQKKqb18GZfCRZLWa..e','ativo',true,'cliente'),
('Celso Mondlane','agente.mpesa@example.com','+258842468135','1988-11-05','$2b$10$DP4sQDSKlr1Lj5X0S65S8.6VfJWNlust3.H5I4WIw58pb2rx65iYi','ativo',true,'agente'),
('Berta Tembe','agente.emola@example.com','+258863579246','1991-02-14','$2b$10$DP4sQDSKlr1Lj5X0S65S8.6VfJWNlust3.H5I4WIw58pb2rx65iYi','ativo',true,'agente')
on conflict (email) do nothing;

-- Perfis de agente para as duas contas de agente
insert into public.agents (user_id, operadora, limite_diario, disponivel, comissao_pct, estado, avaliacao_media, total_operacoes, operacoes_concluidas, tempo_resposta_min, localizacao)
select id, 'mpesa', 2500, true, 1.0, 'ativo', 4.8, 1243, 1201, 4, 'Maputo — Baixa' from public.users where email = 'agente.mpesa@example.com'
on conflict (user_id) do nothing;

insert into public.agents (user_id, operadora, limite_diario, disponivel, comissao_pct, estado, avaliacao_media, total_operacoes, operacoes_concluidas, tempo_resposta_min, localizacao)
select id, 'emola', 2000, true, 1.0, 'ativo', 4.6, 874, 831, 6, 'Matola — Fomento' from public.users where email = 'agente.emola@example.com'
on conflict (user_id) do nothing;
