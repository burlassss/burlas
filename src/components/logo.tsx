import { cn } from "@/lib/utils";

/** Logótipo MOZOUT-USD — moeda lime com cardinal dentro de um squircle floresta. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex select-none items-center gap-2", className)}>
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0" role="img" aria-label="MOZOUT-USD">
        <rect width="64" height="64" rx="17" fill="#163c2b" />
        <circle cx="32" cy="32" r="16.5" fill="#a9f44d" />
        <text x="32" y="40" fontFamily="'Manrope Variable', Arial Black, sans-serif" fontSize="24" fontWeight={900} textAnchor="middle" fill="#121f16">$</text>
      </svg>
      {!compact && (
        <span className="hidden items-baseline gap-1 leading-none min-[360px]:flex">
          <span className="text-[1.1rem] font-extrabold tracking-tight text-forest min-[380px]:text-[1.35rem]">mozout</span>
          <span className="rounded-md bg-forest px-1.5 py-0.5 text-[0.58rem] font-extrabold tracking-[0.14em] text-lime sm:text-[0.62rem]">USD</span>
        </span>
      )}
    </span>
  );
}
