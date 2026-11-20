import type React from "react";
import { requireUser } from "@/lib/auth";
import { db, dataMode } from "@/lib/db";
import { AppHeader } from "@/components/app-header";
import { LiveRefresh } from "@/components/live-refresh";
import { resolverTemaPlano, temaParaCssVars } from "@/lib/themes";

export const dynamic = "force-dynamic";

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [notificacoes, cartoes] = await Promise.all([
    db.listNotifications(user.id, 50),
    db.listCardsByUser(user.id),
  ]);
  const naoLidas = notificacoes.filter((n) => n.estado !== "lida").length;

  // Tema da área do cliente: derivado do cartão do utilizador (nível/tier do plano)
  const cartaoAtivo = cartoes.find((c) => c.estado === "ativo") ?? cartoes[0] ?? null;
  const plano = cartaoAtivo ? await db.findPlan(cartaoAtivo.plan_id) : null;
  const tier = plano?.tier ?? "platina";
  const tema = temaParaCssVars(resolverTemaPlano(plano)) as React.CSSProperties;

  return (
    <div className="min-h-dvh w-full bg-cream" style={tema} data-tier={tier}>
      <LiveRefresh userId={user.id} supabase={dataMode() === "supabase"} />
      <AppHeader nome={user.nome} naoLidas={naoLidas} />
      <main className="safe-x mx-auto w-full max-w-6xl pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-3 sm:pt-6 md:pb-28">{children}</main>
    </div>
  );
}
