import { NextResponse, type NextRequest } from "next/server";

/**
 * No Next 16 o middleware passou a se chamar Proxy.
 *
 * Aqui mora SO a checagem otimista: existe cookie de sessao? O proxy roda no
 * edge, sem banco, e nao serve como autorizacao. Quem autoriza de verdade e
 * `exigirSessao()` em cada pagina e cada server action — server action e
 * alcancavel por POST direto, sem passar por rota nenhuma.
 */

const COOKIE = "giro_sessao";

const PRIVADAS = [
  "/painel",
  "/clientes",
  "/negocios",
  "/caixa",
  "/tarefas",
  "/consultor",
  "/diagnostico",
  "/conta",
];

const PORTAS = ["/entrar", "/criar-conta"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const temCookie = Boolean(request.cookies.get(COOKIE)?.value);

  if (!temCookie && PRIVADAS.some((p) => pathname.startsWith(p))) {
    const destino = new URL("/entrar", request.url);
    destino.searchParams.set("de", pathname);
    return NextResponse.redirect(destino);
  }

  if (temCookie && PORTAS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/painel", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webp)$).*)"],
};
