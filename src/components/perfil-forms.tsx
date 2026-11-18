"use client";

import React from "react";
import { ArrowRight, LogOut, KeyRound } from "lucide-react";
import { Button, Input, Label, FieldError } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useRouter } from "next/navigation";

export function AlterarSenhaForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [atual, setAtual] = React.useState("");
  const [nova, setNova] = React.useState("");
  const [confirmar, setConfirmar] = React.useState("");
  const [erro, setErro] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (nova !== confirmar) return setErro("A confirmação não coincide.");
    setBusy(true);
    try {
      const resp = await fetch("/api/perfil/senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atual, nova }),
      });
      const data = await resp.json();
      if (!resp.ok) return setErro(data.erro);
      setAtual(""); setNova(""); setConfirmar("");
      toast("sucesso", "Palavra-passe alterada", "As tuas próximas sessões exigem a nova palavra-passe.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submeter} className="flex flex-col gap-3">
      <div>
        <Label htmlFor="atual">Palavra-passe atual</Label>
        <Input id="atual" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="nova">Nova palavra-passe</Label>
          <Input id="nova" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="confirmar">Confirmar</Label>
          <Input id="confirmar" type="password" autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
        </div>
      </div>
      <FieldError>{erro}</FieldError>
      <Button type="submit" loading={busy} className="self-start"><KeyRound className="h-4 w-4" /> Alterar palavra-passe <ArrowRight className="h-4 w-4" /></Button>
    </form>
  );
}

export function SairButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/sair", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
      className={className ?? "flex h-12 items-center justify-center gap-2 rounded-full border-2 border-red-200 font-extrabold text-red-600 transition-colors hover:bg-red-50"}
    >
      <LogOut className="h-5 w-5" /> Terminar sessão
    </button>
  );
}
