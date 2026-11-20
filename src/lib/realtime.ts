import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Ping de atualização em tempo real (Supabase Realtime · broadcast).
 *
 * O servidor usa a SERVICE ROLE apenas para publicar um "ping" sem dados
 * sensíveis no canal público `user-updates:<userId>`. O cliente subscreve
 * com a ANON KEY e responde com router.refresh() — logo, saldo, banners,
 * extrato e notificações atualizam sem recarregar a página.
 *
 * Em modo demo (sem Supabase configurado) isto é um no-op e o cliente
 * usa polling leve como fallback.
 */

let servidor: SupabaseClient | null = null;
function clienteServidor(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  if (!servidor) servidor = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return servidor;
}

export async function emitirAtualizacao(userId: string): Promise<void> {
  const s = clienteServidor();
  if (!s || !userId) return;
  const canal = s.channel(`user-updates:${userId}`, { config: { broadcast: { ack: false }, private: false } });
  try {
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => resolve(), 1500);
      canal.subscribe((status) => {
        if (status === "SUBSCRIBED") { clearTimeout(t); resolve(); }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { clearTimeout(t); resolve(); }
      });
    });
    await canal.send({ type: "broadcast", event: "update", payload: { at: Date.now() } });
  } catch {
    /* ping perdido — o safety-net de polling do cliente cobre */
  } finally {
    try { await s.removeChannel(canal); } catch { /* sem impacto */ }
  }
}

/** Versão fire-and-forget para fluxos de serviço. */
export function pingCliente(userId: string | null | undefined): void {
  if (!userId) return;
  void emitirAtualizacao(userId);
}
