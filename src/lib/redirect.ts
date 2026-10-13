import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/validation";

/**
 * Redirect with a relative Location header. The browser stays on the host it
 * used, so session cookies set on this response keep applying (an absolute URL
 * built from the server's own idea of its origin can switch hosts, e.g.
 * 127.0.0.1 → localhost, and silently drop the session). Only same-origin
 * paths are accepted.
 */
export function relativeRedirect(path: string, status: 303 | 307 = 307) {
  return new NextResponse(null, { status, headers: { Location: safeNextPath(path, "/") } });
}

/**
 * Absolute URL on the host the browser used (the proxy requires absolute
 * redirect URLs). Falls back to the request URL's own origin.
 */
export function sameHostUrl(request: NextRequest, path: string): URL {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const base = host && /^[A-Za-z0-9.-]+(:\d+)?$|^\[[0-9a-fA-F:]+\](:\d+)?$/.test(host) ? `${proto}://${host}` : request.nextUrl.origin;
  return new URL(safeNextPath(path, "/"), base);
}
