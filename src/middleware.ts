import { COOKIE_SESSAO } from "@/lib/auth-constants";
import { NextRequest, NextResponse } from "next/server";

/**
 * Proteção de rotas ao nível do edge: verifica apenas a presença do cookie de sessão.
 * A validação completa (expiração + conta) acontece server-side em cada layout/página.
 */
const PROTEGIDAS = [/^\/painel/, /^\/depositar/, /^\/levantar/, /^\/extrato/, /^\/cartoes/, /^\/notificacoes/, /^\/perfil/, /^\/admin/, /^\/agente/];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const protegida = PROTEGIDAS.some((re) => re.test(pathname));
  if (!protegida) return NextResponse.next();

  const temSessao = Boolean(req.cookies.get(COOKIE_SESSAO)?.value);
  if (!temSessao) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/painel/:path*", "/depositar/:path*", "/levantar/:path*", "/extrato/:path*", "/cartoes/:path*", "/notificacoes/:path*", "/perfil/:path*", "/admin/:path*", "/agente/:path*"],
};
