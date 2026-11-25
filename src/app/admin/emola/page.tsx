import { requireAdmin } from "@/lib/auth";
import { temPermissao } from "@/lib/permissions";
import { EmolaAdmin } from "@/components/emola-admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "e-Mola · Cobranças" };

export default async function AdminEmolaPage() {
  const admin = await requireAdmin();

  if (!temPermissao(admin.papel, "emola.gerir")) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">e-Mola · Cobranças</h1>
          <p className="mt-0.5 text-sm font-medium text-ink/55">Sem permissão para gerir o gateway e-Mola.</p>
        </div>
        <div className="rounded-3xl border border-black/5 bg-surface p-6 text-sm font-semibold text-ink/60">
          O teu papel não tem acesso a esta secção. Fala com um superadministrador se precisares de acesso.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-forest">e-Mola · Cobranças</h1>
        <p className="mt-0.5 text-sm font-medium text-ink/55">
          Gateway directo sem agente — configuração, número destino, drain mode e todas as cobranças num sítio só.
        </p>
      </div>
      <EmolaAdmin />
    </div>
  );
}
