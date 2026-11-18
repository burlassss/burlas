# MOZOUT-USD

**A carteira digital em dólares para Moçambique.** Deposita em M-Pesa, e-Mola ou USDT (TRC20), guarda dólares digitais na tua carteira, levanta quando quiseres e pede cartões virtuais para comprar no mundo inteiro.

Plataforma completa de fintech (estilo Airtm/Wise) construída como aplicação full-stack:

- **Área de cliente** — carteira USD, cartões virtuais premium, depósitos, levantamentos, extrato com exportação PDF/CSV, notificações e perfil
- **Rede de agentes** — agentes M-Pesa/e-Mola confirmam pagamentos, executam levantamentos e ganham comissão
- **Painel de administração** — visão geral, utilizadores, cartões, depósitos, levantamentos, agentes, planos, taxas & câmbio, disputas, integrações, auditoria e RBAC
- **Ledger imutável** — o saldo é sempre derivado dos lançamentos; sem coluna de saldo como fonte de verdade

> UI em português (estrutura preparada para i18n). Moçambique · mobile-first · utilizável a 360 px.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript strict |
| Estilo | Tailwind CSS 4 (CSS-first `@theme`) — paleta inspirada na Wise: creme `#f6f7f2`, verde-escuro `#163c2b`, lima `#a9f44d` |
| Base de dados | **Supabase / PostgreSQL** (modo produção) · store em memória (modo demonstração) |
| Auth | Sessões com cookie httpOnly + bcrypt · OTP SMS via Notifica · RBAC (superadmin, admin, financeiro, gestor de agentes, suporte, auditor) |
| Pagamentos | NOWPayments (USDT TRC20, IPN HMAC-SHA512) · agentes para M-Pesa/e-Mola |
| PDF | jsPDF (exportação de extrato) |

---

## Modo demonstração (zero configuração)

Sem nenhuma variável preenchida, a app corre em **modo demonstração**: dados realistas em memória, SMS simulados (códigos no console do servidor em dev) e fluxo USDT simulável na UI.

```bash
npm install
npm run dev     # http://localhost:3000
```

Modo demonstração **sem dados fictícios**: nenhuma transação, saldo, cartão ou avaliação é pré-carregada — tudo começa do zero. Para avaliar, há apenas contas de avaliação zeradas:

| Papel | E-mail | Palavra-passe |
|---|---|---|
| Superadministrador | `admin@mozout.co.mz` | `Mozout#Admin2026` |
| Agente M-Pesa | `agente.mpesa@example.com` | `Agente#123` |
| Agente e-Mola | `agente.emola@example.com` | `Agente#123` |

Regista a tua própria conta de cliente e vais ver a plataforma do zero. A produção (`supabase/seed.sql`) não contém nenhuma conta nem movimento — ver bloco de bootstrap no próprio ficheiro. Para um ambiente de avaliação Supabase com as contas zeradas, usa `supabase/seed.demo.sql`.

---

## Produção com Supabase

### 1. Criar o projecto Supabase

1. Cria um projecto em [supabase.com](https://supabase.com)
2. No **SQL Editor**, executa por ordem:
   - `supabase/migrations/0001_init.sql` — 17 tabelas, índices, constraints, RLS e a função `apply_ledger` (lançamento atómico e idempotente)
   - `supabase/seed.sql` — **apenas configuração** (planos, taxas, cotação); sem contas nem movimentos — segue o bloco de bootstrap no ficheiro para criares o primeiro admin
3. Em **Project Settings → API**, copia: `URL`, `anon key` e `service_role key`

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Preenche:

```bash
NEXT_PUBLIC_APP_URL=https://a-tua-app.co.mz
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # SÓ no servidor — nunca no browser
APP_SECRET=<openssl rand -hex 32>
NOTIFICA_API_TOKEN=...               # SMS (OTP, alertas, recibos)
NOWPAYMENTS_API_KEY=...              # USDT TRC20
NOWPAYMENTS_IPN_SECRET=...           # verificação da assinatura do webhook
```

A presença de `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` ativa automaticamente o modo **Supabase**; caso contrário a app fica em modo demonstração.

### 3. Webhook NOWPayments

Aponta o IPN do painel NOWPayments para:

```
https://a-tua-app.co.mz/api/webhooks/nowpayments
```

O webhook verifica a assinatura HMAC-SHA512 (`NOWPAYMENTS_IPN_SECRET`), resolve a referência e credita apenas uma vez (idempotente) quando o pagamento transita para `finished`/`confirmed`.

### 4. Build & run

```bash
npm run build
npm start
```

---

## Modelo financeiro (invariante fundamental)

- O **ledger** (`ledger_entries`) é a fonte de verdade. Não existe coluna de saldo; `saldo_resultante` é gravado em cada lançamento para auditoria/extrato rápido.
- Toda a mutação de saldo passa por `db.applyLedger()`, que é **atómico e idempotente** — chave única `referencia`; a mesma referência nunca lança duas vezes.
- No Supabase, `apply_ledger()` é uma função `security definer` (transação única com `SELECT … FOR UPDATE`).
- Levantamentos reservam fundos (`reservations`, `RSV-<ref>`) que só são consumidos na conclusão do cliente — um levantamento pendente nunca pode gastar o mesmo dinheiro duas vezes.
- Depósitos via agente só são creditados após **confirmação do agente** e **aprovação de um admin** (dupla verificação). Recusas e estornos também devolvem valor ao cliente, sempre por ledger.

## Segurança

- Passwords com **bcrypt** · sessões em cookie `httpOnly`/`Secure`/`SameSite` · rate limiting em login, OTP e disputas
- **RBAC** em todas as rotas `/api/admin/*` (`src/lib/permissions.ts`) · ações sensíveis registadas em `audit_log` (ator, ação, entidade, antes/depois)
- PIN/CVV/número de cartão **cifrados em repouso** (AES-256-GCM, `APP_SECRET`) — revelados ao titular com registo na auditoria
- Credenciais **apenas no servidor** — nada de segredos em variáveis `NEXT_PUBLIC_*`
- RLS ativada no Supabase (sem acesso direto do browser às tabelas; tudo passa pela API com service role)

## Estrutura

```
src/
  app/                 # App Router: (cliente)/*, agente/, admin/, api/*
  components/          # UI partilhada (cartão virtual, toasts, formulários, painéis)
  lib/
    db/                # Tipos + DataStore (demo-store / supabase-store) — troco por env
    services/          # Lógica financeira: operations, fx, fees, agents, cards, notify
    integrations/      # Adaptadores: notifica (SMS), nowpayments, card-issuer
    permissions.ts     # RBAC · labels.ts (PT) · money.ts (centavos, seguro)
supabase/
  migrations/0001_init.sql
  seed.sql
```

## Estado das integrações sem chaves

| Serviço | Sem chave | Com chave |
|---|---|---|
| Supabase | Store em memória (dados perdidos a cada restart) | PostgreSQL real + RLS |
| Notifica (SMS) | SMS registados no console/servidor | Entrega real |
| NOWPayments | Endereço/pagamento simulados + botão "simular pagamento" na UI de depósito | Pagamentos e IPN reais |
| Emissora de cartões | Emissor mock (números Luhn-válidos) | Implementa `CardIssuer` (Stripe Issuing/Marqeta/Dock) e seleciona por env |

## Notas & honestidade técnica

- Os SMS e pagamentos em modo demonstração são simulados para permitir homologação sem terceiros. Antes de produção, preenche as chaves e executa o checklist em `/admin/integracoes`.
- O modo demo inclui contas de avaliação zeradas com passwords públicas — usa-as só para avaliação local; nunca as recries em produção (o `seed.sql` não as cria).
- `npm audit` reporta vulnerabilidades transitivas; as versões directas (Next 16, React 19) estão pinadas de propósito.
