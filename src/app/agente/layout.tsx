import Link from "next/link";
import { requireAgente } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { Store, Home, LogOut } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel de Agente" };

export default async function AgenteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAgente();
  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-pine text-cream">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/agente" aria-label="Painel de Agente"><Logo compact /></Link>
            <span className="hidden items-center gap-1.5 rounded-full bg-lime/15 px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-lime sm:inline-flex">
              <Store className="h-3.5 w-3.5" /> Painel de Agente
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/painel" className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-cream/80 transition-colors hover:bg-white/10 hover:text-cream">
              <Home className="h-4 w-4" /> <span className="hidden sm:inline">Área de cliente</span>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-5 sm:px-6">{children}</main>
    </div>
  );
}

function SignOutButton() {
  return (
    <form action={async () => {
      "use server";
      const { terminarSessao } = await import("@/lib/auth");
      const { redirect } = await import("next/navigation");
      await terminarSessao();
      redirect("/entrar");
    }}>
      <button type="submit" className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-cream transition-colors hover:bg-white/20" aria-label="Terminar sessão">
        <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sair</span>
      </button>
    </form>
  );
}
