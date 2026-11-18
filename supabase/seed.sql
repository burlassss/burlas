-- ─────────────────────────────────────────────────────────────
-- MOZOUT-USD — Seed de CONFIGURAÇÃO (executar APÓS 0001_init.sql)
-- Contém apenas dados de configuração da plataforma:
-- planos de cartão, taxas operacionais, cotação e definições.
-- NÃO contém contas nem movimentos — ver bloco de bootstrap abaixo.
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

-- ─────────────────────────────────────────────────────────────
-- BOOTSTRAP DO PRIMEIRO ADMIN (executar manualmente, uma vez)
-- Por segurança, o seed NÃO cria nenhuma conta. Para criar o primeiro
-- administrador, define a senha abaixo e executa este bloco:
--
--   1. Gera o hash bcrypt:  node -e "const b=require('bcryptjs');b.hash(process.argv[1],10).then(h=>console.log(h))" 'SUA-SENHA-FORTE'
--   2. Substitui <HASH> e executa:
--
-- insert into public.users (nome, email, telefone, nascimento, password_hash, estado, telefone_verificado, papel)
-- values ('Administrador Geral','admin@mozout.co.mz','+258840000001','1990-01-01','<HASH>','ativo',true,'superadmin')
-- on conflict (email) do nothing;
--
-- Para popular um ambiente de AVALIAÇÃO com contas zeradas (sem movimentos),
-- executa supabase/seed.demo.sql DEPOIS deste ficheiro — nunca em produção.
-- ─────────────────────────────────────────────────────────────
