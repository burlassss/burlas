"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, LayoutDashboard, ArrowDownToLine, ArrowUpRight, Receipt, UserRound, LogOut, CreditCard } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { Logo } from "./logo";

export function AppHeader({ nome, naoLidas }: { nome: string; naoLidas: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  async function sair() {
    await fetch("/api/auth/sair", { method: "POST" });
    router.push("/entrar");
    router.refresh();
  }

  const nav = [
    { href: "/painel", label: "Painel" },
    { href: "/depositar", label: "Depositar" },
    { href: "/levantar", label: "Levantar" },
    { href: "/extrato", label: "Extrato" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-cream/85 backdrop-blur-xl print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/painel" aria-label="MOZOUT-USD — Painel">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-bold transition-colors",
                pathname.startsWith(item.href) ? "bg-forest text-cream" : "text-ink/70 hover:bg-sand hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/notificacoes" className="relative rounded-full p-2.5 text-ink transition-colors hover:bg-sand" aria-label={`Notificações${naoLidas ? `, ${naoLidas} por ler` : ""}`}>
            <Bell className="h-5 w-5" strokeWidth={2.1} />
            {naoLidas > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.55rem] font-extrabold text-white">
                {naoLidas > 9 ? "9+" : naoLidas}
              </span>
            )}
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-2 transition-colors hover:bg-sand"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-xs font-extrabold text-lime">
                {initials(nome)}
              </span>
              <ChevronDown className={cn("h-4 w-4 text-ink/60 transition-transform", menuOpen && "rotate-180")} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-black/5 bg-surface shadow-xl">
                <div className="border-b border-black/5 px-4 py-3">
                  <p className="truncate text-sm font-extrabold text-ink">{nome}</p>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink/50">Conta pessoal</p>
                </div>
                <Link href="/perfil" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-sand">
                  <UserRound className="h-4 w-4 text-forest" /> O meu perfil
                </Link>
                <Link href="/cartoes" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-sand">
                  <CreditCard className="h-4 w-4 text-forest" /> Os meus cartões
                </Link>
                <button onClick={sair} className="flex w-full items-center gap-2.5 border-t border-black/5 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Terminar sessão
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNav pathname={pathname} />
    </header>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  const itens = [
    { href: "/painel", label: "Painel", icon: LayoutDashboard },
    { href: "/depositar", label: "Depositar", icon: ArrowDownToLine },
    { href: "/levantar", label: "Levantar", icon: ArrowUpRight },
    { href: "/extrato", label: "Extrato", icon: Receipt },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/8 bg-surface/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Navegação móvel">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {itens.map((item) => {
          const ativo = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-0.5 py-2", ativo ? "text-forest" : "text-ink/45")}>
              <Icon className="h-5 w-5" strokeWidth={ativo ? 2.4 : 1.8} />
              <span className="text-[0.62rem] font-extrabold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
