"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "sucesso" | "erro" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  titulo: string;
  corpo?: string;
}

const ToastCtx = React.createContext<{ toast: (kind: ToastKind, titulo: string, corpo?: string) => void }>({
  toast: () => undefined,
});

export function useToast() {
  return React.useContext(ToastCtx);
}

const ICONS: Record<ToastKind, React.ElementType> = {
  sucesso: CheckCircle2,
  erro: AlertCircle,
  info: Info,
};
const TONE: Record<ToastKind, string> = {
  sucesso: "border-forest/15 bg-lime-soft text-forest",
  erro: "border-red-200 bg-red-50 text-red-800",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);

  const toast = React.useCallback((kind: ToastKind, titulo: string, corpo?: string) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind, titulo, corpo }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] mx-auto flex w-full max-w-md flex-col gap-2 px-4 print:hidden">
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              role="status"
              className={cn("pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur", TONE[t.kind])}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold tracking-tight">{t.titulo}</p>
                {t.corpo && <p className="mt-0.5 text-xs font-medium opacity-90">{t.corpo}</p>}
              </div>
              <button onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))} className="rounded-full p-1 hover:bg-black/5" aria-label="Fechar aviso">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
