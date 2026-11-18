import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sand">
        <Compass className="h-8 w-8 text-forest" strokeWidth={1.8} />
      </span>
      <p className="text-6xl font-black tracking-tight text-forest">404</p>
      <h1 className="text-xl font-extrabold tracking-tight text-ink">Página não encontrada</h1>
      <p className="max-w-sm text-sm font-medium text-ink/60">O endereço que procuras não existe ou foi movido. Verifica o link e tenta novamente.</p>
      <Link href="/painel" className="mt-1 flex h-12 items-center gap-2 rounded-full bg-forest px-6 font-extrabold text-lime hover:bg-moss">Voltar ao painel</Link>
    </div>
  );
}
