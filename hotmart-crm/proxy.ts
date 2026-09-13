import { NextResponse, type NextRequest } from "next/server";

/**
 * Guarda de rota.
 *
 * A verificacao real da sessao acontece no layout do painel, que roda no
 * servidor e tem acesso ao banco. Aqui e so o corte grosso: sem cookie, nem
 * chega a renderizar. O proxy roda antes de tudo e nao deve depender de
 * modulo compartilhado (e por isso nao valida a assinatura do JWT aqui).
 */

const COOKIE = "hotmart_crm_sessao";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const publico =
    pathname.startsWith("/entrar") ||
    // O webhook e chamado pela Hotmart, que nao tem cookie nenhum; ele se
    // protege sozinho com o hottok, verificado dentro da rota.
    pathname.startsWith("/api/webhook") ||
    // O cron da Vercel tambem nao tem cookie: se protege com CRON_SECRET.
    pathname.startsWith("/api/cron");

  if (publico) return NextResponse.next();

  if (!req.cookies.get(COOKIE)) {
    const destino = new URL("/entrar", req.url);
    destino.searchParams.set("de", pathname);
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
