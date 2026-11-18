"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, ArrowDownToLine, ArrowUpRight, Store, CreditCard,
  Layers, Percent, Plug2, BellRing, Scale, ScrollText, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Papel } from "@/lib/db/types";
import { temPermissao, type Permissao } from "@/lib/permissions";
import { PAPEL_LABEL } from "@/lib/labels";

interface ItemNav { href: string; label: string; icon: React.ElementType; permissao: Permissao; badge?: number }
interface Secao { titulo: string; itens: ItemNav[] }

export function AdminSidebar({ papel, depositosPendentes, levantamentosPendentes, disputasAbertas }: { papel: Papel; depositosPendentes: number; levantamentosPendentes: number; disputasAbertas: number }) {
  const pathname = usePathname();

  const secoes: Secao[] = [
    { titulo: "Geral", itens: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, permissao: "dashboard.ver" }] },
    {
      titulo: "Operações",
      itens: [
        { href: "/admin/depositos", label: "Depósitos", icon: ArrowDownToLine, permissao: "depositos.aprovar", badge: depositosPendentes },
        { href: "/admin/levantamentos", label: "Levantamentos", icon: ArrowUpRight, permissao: "levantamentos.gerir", badge: levantamentosPendentes },
        { href: "/admin/disputas", label: "Disputas", icon: Scale, permissao: "disputas.gerir", badge: disputasAbertas },
      ],
    },
    {
      titulo: "Pessoas",
      itens: [
        { href: "/admin/utilizadores", label: "Utilizadores", icon: Users, permissao: "utilizadores.ver" },
        { href: "/admin/agentes", label: "Agentes", icon: Store, permissao: "agentes.gerir" },
        { href: "/admin/cartoes", label: "Cartões", icon: CreditCard, permissao: "cartoes.gerir" },
      ],
    },
    {
      titulo: "Catálogo",
      itens: [{ href: "/admin/planos", label: "Planos", icon: Layers, permissao: "planos.gerir" }],
    },
    {
      titulo: "Sistema",
      itens: [
        { href: "/admin/taxas", label: "Taxas & Câmbio", icon: Percent, permissao: "taxas.gerir" },
        { href: "/admin/integracoes", label: "Integrações", icon: Plug2, permissao: "integracoes.ver" },
        { href: "/admin/notificacoes", label: "Notificações", icon: BellRing, permissao: "notificacoes.ver" },
        { href: "/admin/auditoria", label: "Auditoria", icon: ScrollText, permissao: "auditoria.ver" },
      ],
    },
  ];

  const conteudo = (
    <>
      {secoes.map((secao) => {
        const visiveis = secao.itens.filter((item) => temPermissao(papel, item.permissao));
        if (visiveis.length === 0) return null;
        return (
          <div key={secao.titulo} className="mt-5 first:mt-0">
            <p className="px-3 text-[0.6rem] font-extrabold uppercase tracking-[0.22em] text-cream/40">{secao.titulo}</p>
            <nav className="mt-1.5 flex flex-col gap-0.5">
              {visiveis.map((item) => {
                const ativo = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={ativo ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.83rem] font-bold transition-colors",
                      ativo ? "bg-lime text-pine" : "text-cream/75 hover:bg-white/8 hover:text-cream",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <span className={cn("flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6rem] font-extrabold", ativo ? "bg-pine text-lime" : "bg-lime text-pine")}>
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        );
      })}
      <div className="mt-6 border-t border-white/10 px-3 pt-4">
        <p className="flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-lime/70"><ShieldCheck className="h-4 w-4" /> {PAPEL_LABEL[papel] ?? papel}</p>
        <p className="mt-1 text-[0.62rem] font-medium text-cream/40">Acesso restrito · todas as ações são auditadas</p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-pine px-3 py-5 lg:flex">
        <Link href="/admin" className="px-3">
          <span className="text-lg font-extrabold tracking-tight text-cream">mozout<span className="ml-1.5 rounded-md bg-lime px-1.5 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-pine align-[2px]">Admin</span></span>
        </Link>
        <div className="mt-4">{conteudo}</div>
      </aside>
      {/* Mobile top nav */}
      <div className="lg:hidden">
        <div className="border-b border-black/5 bg-pine px-3 py-2.5">
          <Link href="/admin" className="text-base font-extrabold text-cream">mozout<span className="ml-1.5 rounded-md bg-lime px-1.5 py-0.5 text-[0.55rem] font-extrabold uppercase text-pine align-[2px]">Admin</span></Link>
        </div>
        <div className="flex gap-1.5 overflow-x-auto border-b border-black/5 bg-pine px-3 pb-2.5">
          {secoes.flatMap((s) => s.itens).filter((item) => temPermissao(papel, item.permissao)).map((item) => {
            const ativo = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.7rem] font-bold", ativo ? "bg-lime text-pine" : "text-cream/70")}>
                <item.icon className="h-3.5 w-3.5" />{item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
