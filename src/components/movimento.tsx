import {
  ArrowDownLeft, ArrowUpRight, ShoppingBag, Receipt, Undo2, SlidersHorizontal,
  CreditCard, CalendarClock, RotateCcw, Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAPA: Record<string, { icon: React.ElementType; classe: string }> = {
  deposito: { icon: ArrowDownLeft, classe: "bg-lime-soft text-forest" },
  levantamento: { icon: ArrowUpRight, classe: "bg-amber-100 text-amber-800" },
  compra: { icon: ShoppingBag, classe: "bg-sky-100 text-sky-800" },
  taxa: { icon: Receipt, classe: "bg-sand text-ink/70" },
  reembolso: { icon: Undo2, classe: "bg-lime-soft text-forest" },
  ajuste: { icon: SlidersHorizontal, classe: "bg-violet-100 text-violet-800" },
  ativacao_cartao: { icon: CreditCard, classe: "bg-sand text-ink/70" },
  mensalidade: { icon: CalendarClock, classe: "bg-sand text-ink/70" },
  comissao: { icon: Percent, classe: "bg-violet-100 text-violet-800" },
  estorno: { icon: RotateCcw, classe: "bg-lime-soft text-forest" },
};

export function MovimentoIcon({ tipo, className }: { tipo: string; className?: string }) {
  const cfg = MAPA[tipo] ?? MAPA.taxa;
  const Icon = cfg.icon;
  return (
    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", cfg.classe, className)}>
      <Icon className="h-5 w-5" strokeWidth={2} />
    </span>
  );
}
