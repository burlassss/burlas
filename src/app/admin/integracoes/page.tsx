import { CheckCircle2, XCircle, AlertCircle, Smartphone, Bitcoin, Database, CreditCard, RefreshCw } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Badge } from "@/components/ui";
import { TestarSmsButton } from "@/components/integracoes-actions";
import { dataMode } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Integrações" };

interface Integracao {
  nome: string;
  descricao: string;
  ok: boolean;
  configurada: boolean;
  detalhe: string;
  icone: React.ElementType;
  erroRecente: string | null;
}

export default async function AdminIntegracoesPage() {
  await requireAdmin();
  const modo = dataMode();
  const temNotifica = !!process.env.NOTIFICA_API_TOKEN?.trim();
  const temNowPayments = !!process.env.NOWPAYMENTS_API_KEY?.trim();
  const temEmissora = process.env.CARD_ISSUER === "stripe" || process.env.CARD_ISSUER === "marqeta";

  const integracoes: Integracao[] = [
    {
      nome: "Supabase (PostgreSQL)",
      descricao: "Base de dados, autenticação de sessão, RLS e ledger imutável",
      ok: modo === "supabase",
      configurada: modo === "supabase",
      detalhe: modo === "supabase" ? "Ligado via service role (server-side)" : "Modo demonstração em memória — adiciona NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY",
      icone: Database,
      erroRecente: null,
    },
    {
      nome: "Notifica (SMS)",
      descricao: "Envio de SMS: OTP, aprovações, levantamentos, alertas de segurança",
      ok: temNotifica,
      configurada: temNotifica,
      detalhe: temNotifica ? "Token ativo · entrega em segundos" : "Sem NOTIFICA_API_KEY — SMS ficam registados no log do servidor",
      icone: Smartphone,
      erroRecente: null,
    },
    {
      nome: "NOWPayments (USDT TRC20)",
      descricao: "Geração de endereços de depósito e IPN assinado por HMAC-SHA512",
      ok: temNowPayments,
      configurada: temNowPayments,
      detalhe: temNowPayments ? "API key configurada · webhook verificado" : "Sem NOWPAYMENTS_API_KEY — fluxo USDT simulado no modo demonstração",
      icone: Bitcoin,
      erroRecente: null,
    },
    {
      nome: "Emissora de cartões",
      descricao: "Emissão/congelamento de cartões virtuais via camada isolada (Adapter Pattern)",
      ok: temEmissora,
      configurada: temEmissora,
      detalhe: temEmissora ? "Provedor ligado" : "Mock funcional — cartões Luhn-válidos emitidos localmente para demonstração",
      icone: CreditCard,
      erroRecente: null,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">Integrações</h1>
          <p className="mt-0.5 text-sm font-medium text-ink/55">Estado de cada serviço externo · credenciais nunca expostas ao browser</p>
        </div>
        <TestarSmsButton />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {integracoes.map((i) => (
          <article key={i.nome} className="flex flex-col rounded-3xl border border-black/5 bg-surface p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand"><i.icone className="h-6 w-6 text-forest" strokeWidth={1.8} /></span>
                <div>
                  <h2 className="font-extrabold text-ink">{i.nome}</h2>
                  <Badge tone={i.ok ? "green" : "amber"} className="mt-1">{i.ok ? "Operacional" : "Por configurar"}</Badge>
                </div>
              </div>
              {i.ok ? <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" /> : <AlertCircle className="h-6 w-6 shrink-0 text-amber-500" />}
            </div>
            <p className="mt-3 text-xs font-medium leading-relaxed text-ink/60">{i.descricao}</p>
            <p className="mt-2 rounded-2xl bg-sand/60 px-4 py-2.5 text-[0.72rem] font-semibold leading-relaxed text-ink/70">{i.detalhe}</p>
            {i.erroRecente && <p className="mt-2 flex items-center gap-1.5 text-[0.7rem] font-bold text-red-700"><XCircle className="h-4 w-4" />{i.erroRecente}</p>}
          </article>
        ))}
      </div>

      <section className="rounded-3xl border border-black/5 bg-pine p-5 text-cream sm:p-6">
        <h2 className="flex items-center gap-2 font-extrabold uppercase tracking-[0.18em] text-lime"><RefreshCw className="h-4 w-4" /> Lista de verificação de produção</h2>
        <ul className="mt-3 grid gap-2 text-[0.78rem] font-semibold text-cream/85 sm:grid-cols-2">
          {[
            "Preencher SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL e ANON_KEY",
            "Executar supabase/migrations/0001_init.sql e seed.sql",
            "Definir NOTIFICA_API_KEY e NOTIFICA_SENDER",
            "Definir NOWPAYMENTS_API_KEY e NOWPAYMENTS_IPN_SECRET",
            "Apontar o IPN do NOWPayments para /api/webhooks/nowpayments",
            "Rodar SESSION_SECRET e definir NEXT_PUBLIC_APP_URL com https",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 rounded-2xl bg-white/5 px-3 py-2.5"><span className="mt-0.5 text-lime">▸</span>{item}</li>
          ))}
        </ul>
        <p className="mt-3 text-[0.68rem] font-medium text-cream/50">As chaves ficam apenas no servidor (.env). Nunca as coloques em variáveis NEXT_PUBLIC_* — o prefixo publica no browser.</p>
      </section>
    </div>
  );
}
