"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { useToast } from "@/components/toast";

export function KycActions({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<"aprovar" | "rejeitar" | null>(null);
  const [recusarAberto, setRecusarAberto] = React.useState(false);
  const [motivo, setMotivo] = React.useState("");

  async function decidir(acao: "aprovar" | "rejeitar", motivoArg?: string) {
    setBusy(acao);
    try {
      const resp = await fetch(`/api/admin/kyc/${id}/decidir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, motivo: motivoArg }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        toast("erro", acao === "aprovar" ? "Não foi possível aprovar" : "Não foi possível recusar", data?.erro);
        return;
      }
      toast("sucesso", acao === "aprovar" ? "Identidade verificada" : "Verificação recusada", acao === "aprovar" ? "O limite do cliente foi aumentado." : "O cliente foi notificado com o motivo.");
      setRecusarAberto(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col justify-center gap-2">
      <Button variant="dark" size="md" loading={busy === "aprovar"} onClick={() => decidir("aprovar")}>
        {busy === "aprovar" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Aprovar
      </Button>
      <Button variant="outline" size="md" onClick={() => setRecusarAberto(true)}>
        <X className="h-5 w-5" /> Recusar
      </Button>

      {recusarAberto && (
        <Modal open onClose={() => setRecusarAberto(false)} title="Recusar verificação" size="md">
          <p className="text-sm font-medium text-ink/60">O cliente vê esta mensagem. Sê claro e objetivo.</p>
          <textarea
            autoFocus
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="Ex.: Documento ilegível/cortado; tenta novamente com melhor luz."
            className="mt-3 w-full rounded-2xl border-2 border-mist bg-surface p-3 text-sm font-medium focus:border-forest focus:outline-none"
          />
          <Button variant="dark" size="lg" loading={busy === "rejeitar"} className="mt-3 w-full" onClick={() => decidir("rejeitar", motivo)}>
            <X className="h-5 w-5" /> Recusar e notificar
          </Button>
        </Modal>
      )}
    </div>
  );
}
