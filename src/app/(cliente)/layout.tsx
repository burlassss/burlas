import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppHeader } from "@/components/app-header";

export const dynamic = "force-dynamic";

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const notificacoes = await db.listNotifications(user.id, 50);
  const naoLidas = notificacoes.filter((n) => n.estado !== "lida").length;

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader nome={user.nome} naoLidas={naoLidas} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 sm:pt-6 md:pb-10">{children}</main>
    </div>
  );
}
