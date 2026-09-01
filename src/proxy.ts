import { NextResponse, type NextRequest } from "next/server";

import { subdomainOf } from "@/lib/tenant/host";

/**
 * Puts the agency back into the path.
 *
 * The routes are `/[agence]/[ville]/…`, but the URL a client agency hands out
 * is `agence.exemple.fr/ville/…`: this rewrites the second onto the first, so
 * one deployment serves every agency and the agency segment never shows up in
 * the address bar. A rewrite, not a redirect — the visitor keeps the URL they
 * clicked.
 *
 * Without a recognised subdomain nothing happens, which is what makes
 * `/rive-ouest/boulogne-billancourt` work as-is in development and on a
 * preview deployment.
 */
export function proxy(request: NextRequest) {
  const agency = subdomainOf(request.headers.get("host"));
  if (!agency) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${agency}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  /**
   * Everything except the API — the funnel calls `/api/estimation` on its own
   * host and names its agency in the payload — and except the framework's own
   * assets and any file with an extension.
   */
  matcher: ["/((?!api/|_next/|favicon\\.ico|.*\\.[\\w]+$).*)"],
};
