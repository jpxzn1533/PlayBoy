import { NextResponse, type NextRequest } from "next/server";

// Verificação otimista (apenas presença do cookie). A validação real da sessão e das
// permissões acontece no servidor, em cada layout, página, server action e rota de API.
const PROTECTED = ["/admin", "/conta", "/checkout"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !request.cookies.get("pb_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/conta/:path*", "/checkout/:path*"] };
