import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Home, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administração" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  const [depositos, levantamentos, disputas, kycPendentes] = await Promise.all([
    db.listDeposits({ estado: "pendente_analise", limit: 100 }),
    db.listWithdrawals({}),
    db.listDisputes(),
    db.listKycSubmissions({ estado: "pendente" }),
  ]);
  const levantamentosPendentes = levantamentos.filter((w) => ["criada", "aguardando_agente", "atribuida", "em_processamento", "enviada", "aguardando_confirmacao"].includes(w.estado)).length;
  const disputasAbertas = disputas.filter((d) => d.estado === "aberta" || d.estado === "em_analise").length;

  return (
    <div className="min-h-dvh bg-[#101b14]">
      {/* Top bar administrativa */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0c1610]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-2 px-3 sm:px-5">
          <div className="flex items-center gap-3">
            <Link href="/admin" aria-label="Administração MOZOUT"><Logo compact className="[&_svg]:h-8 [&_svg]:w-8" /></Link>
            <span className="rounded-full border border-lime/30 bg-lime/10 px-2.5 py-1 text-[0.58rem] font-extrabold uppercase tracking-[0.22em] text-lime">Área restrita</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[0.7rem] font-semibold text-cream/50 md:inline">Sessão de {admin.nome.split(" ")[0]}</span>
            <Link href="/painel" className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[0.7rem] font-bold text-cream/70 transition-colors hover:bg-white/8 hover:text-cream">
              <Home className="h-4 w-4" /> <span className="hidden sm:inline">Área de cliente</span>
            </Link>
            <form action={async () => {
              "use server";
              const { terminarSessao } = await import("@/lib/auth");
              const { redirect } = await import("next/navigation");
              await terminarSessao();
              redirect("/entrar");
            }}>
              <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-white/8 px-2.5 py-2 text-[0.7rem] font-bold text-cream/80 transition-colors hover:bg-white/15" aria-label="Terminar sessão">
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sair</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <AdminSidebar papel={admin.papel} depositosPendentes={depositos.length} levantamentosPendentes={levantamentosPendentes} disputasAbertas={disputasAbertas} kycPendentes={kycPendentes.length} />
        <main className="min-w-0 flex-1 bg-cream safe-x pb-16 pt-4 sm:pt-5">{children}</main>
      </div>
    </div>
  );
}
