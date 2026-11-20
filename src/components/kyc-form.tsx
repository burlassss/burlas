"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Check, ShieldCheck, BadgeCheck, ArrowRight, Upload, Camera, IdCard, BookOpen, Car, ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Button, FieldError } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

/** Redimensiona e comprime a foto no cliente (máx 1280px, JPEG ~0.82). */
export async function ficheiroParaDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const escala = Math.min(1, 1280 / Math.max(img.width, img.height));
  if (escala >= 0.99 && file.size < 400_000) return dataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function UploadBox({ label, obrigatorio, valor, onChange, icon: Icone }: { label: string; obrigatorio?: boolean; valor: string | null; onChange: (v: string | null) => void; icon: React.ElementType }) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="text-[0.72rem] font-extrabold uppercase tracking-wide text-ink/55">{label}{obrigatorio && <span className="text-red-500"> *</span>}</p>
      {valor ? (
        <div className="relative mt-1.5 overflow-hidden rounded-2xl border-2 border-mist">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={valor} alt={label} className="h-36 w-full object-contain bg-black/90" />
          <button type="button" onClick={() => onChange(null)} className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1.5 text-[0.7rem] font-bold text-white backdrop-blur">Trocar</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="mt-1.5 flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-mist bg-sand/40 text-ink/50 transition-colors hover:border-forest hover:text-forest"
        >
          <Icone className="h-7 w-7" strokeWidth={1.6} />
          <span className="flex items-center gap-1.5 text-xs font-bold"><Upload className="h-4 w-4" /> Tocar para enviar</span>
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void ficheiroParaDataUrl(f).then(onChange).catch(() => undefined);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Ecrã de sucesso após submissão — reusado pelo onboarding e pela página /kyc. */
export function KycSucesso({ compact }: { compact?: boolean }) {
  return (
    <div className={cn("text-center", compact && "py-2")}>
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lime-soft">
        <BadgeCheck className="h-8 w-8 text-forest" strokeWidth={1.8} />
      </span>
      <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.03em] text-forest">Documentos em análise</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-ink/60">A nossa equipa vai rever a tua verificação em breve (normalmente até 24h). Avisamos-te por SMS e na app assim que for decidida.</p>
      <Link href="/painel" className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 text-base font-extrabold text-lime hover:bg-moss">
        Ir para o painel <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  );
}

export function KycForm({ onSucesso, onVoltar }: { onSucesso?: () => void; onVoltar?: () => void }) {
  const { toast } = useToast();
  const [tipoDoc, setTipoDoc] = React.useState<"bi" | "passaporte" | "carta_conducao">("bi");
  const [numeroDoc, setNumeroDoc] = React.useState("");
  const [frente, setFrente] = React.useState<string | null>(null);
  const [verso, setVerso] = React.useState<string | null>(null);
  const [selfie, setSelfie] = React.useState<string | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const precisaVerso = tipoDoc !== "passaporte";

  async function submeterKyc(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!frente) return setErro("Envia a frente do documento.");
    if (precisaVerso && !verso) return setErro("Envia o verso do documento.");
    setLoading(true);
    try {
      const resp = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo_documento: tipoDoc, numero_documento: numeroDoc, frente, verso, selfie }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) return setErro(data?.erro ?? "Não foi possível enviar os documentos.");
      toast("sucesso", "Documentos enviados", "A tua verificação está em análise.");
      onSucesso?.();
    } catch {
      setErro("Erro de ligação. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submeterKyc} className="flex flex-col gap-4">
      <div>
        <p className="text-[0.72rem] font-extrabold uppercase tracking-wide text-ink/55">Tipo de documento</p>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {([
            { id: "bi", label: "BI", icon: IdCard },
            { id: "passaporte", label: "Passaporte", icon: BookOpen },
            { id: "carta_conducao", label: "Carta", icon: Car },
          ] as const).map(({ id, label, icon: Icone }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTipoDoc(id)}
              aria-pressed={tipoDoc === id}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-2 py-2 text-[0.72rem] font-bold transition-all",
                tipoDoc === id ? "border-forest bg-forest text-lime" : "border-mist bg-surface text-ink/65 hover:border-forest/40",
              )}
            >
              <Icone className="h-5 w-5" strokeWidth={1.8} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="numero-doc" className="text-[0.72rem] font-extrabold uppercase tracking-wide text-ink/55">Número do documento</label>
        <input
          id="numero-doc"
          required
          value={numeroDoc}
          onChange={(e) => setNumeroDoc(e.target.value)}
          placeholder="Ex.: 110200304050A"
          autoComplete="off"
          className="mt-1.5 h-12 w-full rounded-2xl border-2 border-mist bg-surface px-4 font-mono text-base font-bold uppercase tracking-wider focus:border-forest focus:outline-none"
        />
      </div>

      <UploadBox label={tipoDoc === "passaporte" ? "Página principal" : "Frente do documento"} obrigatorio valor={frente} onChange={setFrente} icon={IdCard} />
      {precisaVerso && <UploadBox label="Verso do documento" obrigatorio valor={verso} onChange={setVerso} icon={IdCard} />}
      <UploadBox label="Selfie (opcional)" valor={selfie} onChange={setSelfie} icon={Camera} />

      <FieldError>{erro}</FieldError>
      <div className="flex items-center gap-3">
        {onVoltar && (
          <button type="button" onClick={onVoltar} className="inline-flex items-center gap-1.5 text-sm font-bold text-ink/55 hover:text-ink"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        )}
        <Button type="submit" size="lg" loading={loading} className="flex-1">
          <ShieldCheck className="h-5 w-5" /> Enviar para verificação
        </Button>
      </div>
    </form>
  );
}
