"use client";

import React from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────── Button ─────────────────────────── */
type ButtonVariant = "primary" | "dark" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-lime text-pine hover:bg-lime-strong shadow-[0_2px_0_0_#121f16] hover:shadow-[0_2px_0_0_#121f16] active:translate-y-[1px] active:shadow-none",
  dark: "bg-forest text-cream hover:bg-moss",
  outline: "border-2 border-mist bg-surface text-ink hover:border-ink",
  ghost: "text-ink hover:bg-sand",
  danger: "bg-red-600 text-white hover:bg-red-700",
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-6 text-[0.95rem] gap-2",
  lg: "h-14 px-8 text-base gap-2.5",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-full font-bold tracking-tight transition-all duration-200",
        "disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold tracking-tight transition-all duration-200",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
    >
      {children}
    </a>
  );
}

/* ─────────────────────────── Inputs ─────────────────────────── */
export function Label({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold text-ink">
      {children}
      {hint && <span className="ml-2 font-medium text-ink/45">{hint}</span>}
    </label>
  );
}

const inputBase =
  "h-12 w-full rounded-2xl border-2 border-mist bg-surface px-4 text-[0.95rem] text-ink placeholder:text-ink/35 transition-colors focus:border-forest focus:outline-none";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(inputBase, className)} {...props} />;
});

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(inputBase, "appearance-none", className)} {...props}>
      {children}
    </select>
  );
});

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs font-semibold text-red-600">{children}</p>;
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs font-medium text-ink/55">{children}</p>;
}

/* ─────────────────────────── Card ──────────────────────────── */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-3xl border border-black/5 bg-surface p-5 shadow-[0_1px_2px_rgb(18_31_22/0.06),0_12px_32px_-16px_rgb(18_31_22/0.15)] sm:p-6", className)}
      {...props}
    />
  );
}

/* ─────────────────────────── Badge ─────────────────────────── */
type BadgeTone = "green" | "amber" | "red" | "blue" | "zinc";
const badgeTones: Record<BadgeTone, string> = {
  green: "bg-lime-soft text-forest",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-800",
  zinc: "bg-sand text-ink/70",
};
export function Badge({ tone = "zinc", className, children }: { tone?: BadgeTone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-wide", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

/* ─────────────────────────── Spinner ────────────────────────── */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-forest", className)} aria-label="A carregar…" />;
}

/* ─────────────────────────── EmptyState ─────────────────────── */
export function EmptyState({ icon: Icon, title, description, action }: { icon?: React.ElementType; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sand">
          <Icon className="h-6 w-6 text-forest" />
        </div>
      )}
      <p className="text-base font-extrabold tracking-tight text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm font-medium text-ink/55">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/* ─────────────────────────── Modal ──────────────────────────── */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 cursor-pointer bg-pine/55 backdrop-blur-[2px]" onClick={onClose} aria-label="Fechar" />
      <div
        className={cn(
          "relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-6 shadow-2xl sm:rounded-3xl sm:p-7",
          size === "md" ? "sm:max-w-md" : "sm:max-w-2xl",
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-extrabold tracking-tight text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-ink/50 transition-colors hover:bg-sand hover:text-ink" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────── Stat ───────────────────────────── */
export function Stat({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon?: React.ElementType }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.72rem] font-extrabold uppercase tracking-wider text-ink/50">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-forest/70" />}
      </div>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs font-medium text-ink/50">{hint}</p>}
    </div>
  );
}
