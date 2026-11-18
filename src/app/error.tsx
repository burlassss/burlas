"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
        <AlertTriangle className="h-8 w-8 text-amber-600" strokeWidth={1.8} />
      </span>
      <h1 className="text-2xl font-extrabold tracking-tight text-forest">Algo correu mal</h1>
      <p className="max-w-md text-sm font-medium leading-relaxed text-ink/60">
        Ocorreu um erro inesperado ao carregar esta página. A equipa MOZOUT foi notificada. Tenta novamente — na maioria dos casos resolve.
      </p>
      {error?.digest && <p className="font-mono text-[0.65rem] font-bold text-ink/35">Referência: {error.digest}</p>}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button onClick={reset} className="flex h-12 items-center gap-2 rounded-full bg-forest px-6 font-extrabold text-lime transition-colors hover:bg-moss">
          <RotateCcw className="h-4 w-4" /> Tentar novamente
        </button>
        <Link href="/painel" className="flex h-12 items-center gap-2 rounded-full border-2 border-mist px-6 font-extrabold text-ink transition-colors hover:border-forest">
          <Home className="h-4 w-4" /> Voltar ao painel
        </Link>
      </div>
    </div>
  );
}
