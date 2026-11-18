import { Bell } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NotificacoesLista, AutoRefresh } from "@/components/notificacoes-lista";
import { EmptyState } from "@/components/ui";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notificações" };

export default async function NotificacoesPage() {
  const user = await requireUser();
  const notificacoes = await db.listNotifications(user.id, 60);

  return (
    <div className="mx-auto w-full max-w-2xl pt-1 sm:pt-3">
      <AutoRefresh />
      <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest sm:text-3xl">Notificações</h1>
      <p className="mb-4 mt-1 text-sm font-medium text-ink/55">Tudo o que importa sobre a tua conta, num só lugar.</p>
      {notificacoes.length === 0 ? (
        <EmptyState icon={<Bell className="h-6 w-6 text-forest" />} title="Sem notificações" description="Quando algo relevante acontecer na tua conta, avisamos-te aqui e por SMS." />
      ) : (
        <NotificacoesLista itens={notificacoes} />
      )}
    </div>
  );
}
