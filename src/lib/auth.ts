import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import type { Papel, User } from "./db/types";
import { sha256, tokenAleatorio } from "./crypto";
import { isAdminPapel } from "./permissions";

import { COOKIE_SESSAO } from "./auth-constants";
export { COOKIE_SESSAO };
const DURACAO_SESSAO_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function criarSessao(userId: string, ip?: string | null, userAgent?: string | null): Promise<string> {
  const token = tokenAleatorio(32);
  await db.insertSession({
    user_id: userId,
    token_hash: sha256(token),
    expira_em: new Date(Date.now() + DURACAO_SESSAO_MS).toISOString(),
    ip: ip ?? null,
    user_agent: userAgent ?? null,
  });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(DURACAO_SESSAO_MS / 1000),
  });
  return token;
}

export async function terminarSessao() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESSAO)?.value;
  if (token) await db.deleteSession(sha256(token));
  cookieStore.delete(COOKIE_SESSAO);
}

export async function getSessao() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  return db.findSessionByTokenHash(sha256(token));
}

export async function getSessaoUtilizador(): Promise<{ session: { expira_em: string }; user: User } | null> {
  return getSessao();
}

/** Exige utilizador autenticado; redireciona para /entrar caso contrário. */
export async function requireUser(): Promise<User> {
  const s = await getSessao();
  if (!s) redirect("/entrar");
  if (s.user.estado === "suspenso" || s.user.estado === "bloqueado") redirect("/conta-suspensa");
  return s.user;
}

/** Exige papel de administração; redireciona para /painel caso contrário. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!isAdminPapel(user.papel)) redirect("/painel");
  return user;
}

/** Exige papel de agente; redireciona para /painel caso contrário. */
export async function requireAgente(): Promise<User> {
  const user = await requireUser();
  if (user.papel !== "agente") redirect("/painel");
  return user;
}

export function destinoPorPapel(papel: Papel): string {
  if (isAdminPapel(papel)) return "/admin";
  if (papel === "agente") return "/agente";
  return "/painel";
}

export function ipDoPedido(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? "unknown";
}

void crypto;
