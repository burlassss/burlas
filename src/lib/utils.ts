import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskTelefone(tel: string): string {
  if (!tel) return "";
  const digits = tel.replace(/\D/g, "");
  if (digits.length < 7) return tel;
  return tel.slice(0, 5) + "••••" + tel.slice(-2);
}

export function maskEmail(email: string): string {
  const [u, d] = email.split("@");
  if (!d) return email;
  const head = u.slice(0, 2);
  return `${head}${"•".repeat(Math.max(u.length - 2, 2))}@${d}`;
}

export function maskCard(numero: string): string {
  const digits = numero.replace(/\D/g, "");
  return `•••• •••• •••• ${digits.slice(-4)}`;
}

export function formatCardNumber(numero: string): string {
  return numero.replace(/(.{4})/g, "$1  ").trim();
}

export function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

/** Validação pragmática de telefone no formato internacional */
export function telefoneValido(tel: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(tel.replace(/\s/g, ""));
}
