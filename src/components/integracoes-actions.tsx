"use client";

import React from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/toast";

/** Envia um SMS de teste para o telefone da conta administrativa autenticada. */
export function TestarSmsButton() {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [ok, setOk] = React.useState(false);

  async function enviar() {
    setBusy(true);
    try {
      const resp = await fetch("/api/admin/integracoes/testar-sms", { method: "POST" });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        setOk(true);
        toast("sucesso", "SMS de teste enviado", data.simulado ? "Registado no log (modo demonstração)" : "Entregue via Notifica para o teu telefone");
        setTimeout(() => setOk(false), 4000);
      } else {
        toast("erro", "Falha no envio", data.erro ?? "Verifica a configuração Notifica.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={enviar} disabled={busy} className="flex h-11 items-center gap-2 rounded-2xl bg-pine px-4 text-xs font-extrabold text-lime transition-colors hover:bg-moss disabled:opacity-60">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : ok ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
      Testar SMS (para mim)
    </button>
  );
}
