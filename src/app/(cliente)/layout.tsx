import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppHeader } from "@/components/app-header";

export const dynamic = "force-dynamic";

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const notificacoes = await db.listNotifications(user.id, 50);
  const naoLidas = notificacoes.filter((n) => n.estado !== "lida").length;

  return (
    <div className="min-h-dvh w-full bg-cream">
      <AppHeader nome={user.nome} naoLidas={naoLidas} />
      <main className="safe-x mx-auto w-full max-w-6xl pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-3 sm:pt-6 md:pb-28">{children}</main>
    </div>
  );
}
