"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { RotateCw, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast";

export function ReenviarButton({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function reenviar() {
    setBusy(true);
    try {
      const resp = await fetch(`/api/admin/notificacoes/${id}/reenviar`, { method: "POST" });
      const data = await resp.json();
      if (resp.ok) toast("sucesso", "Notificação reenviada", "SMS reencaminhado ao cliente.");
      else toast("erro", "Falha ao reenviar", data.erro);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={reenviar} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-sand px-2.5 py-1.5 text-[0.68rem] font-extrabold text-ink/75 hover:bg-mist" aria-label="Reenviar SMS">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
      Reenviar
    </button>
  );
}
