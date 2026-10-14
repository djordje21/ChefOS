import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";
import { sameHostUrl } from "@/lib/redirect";

const PROTECTED_PREFIXES = ["/app", "/account"];

/**
 * Public pages that never read the session: the kitchen landing and the
 * frontend-only destinations (fictional data, no Supabase calls). Skipping the
 * Auth round trip keeps them fast and working even when Auth is unreachable.
 * Everything else, including every protected route, still goes through getUser().
 */
const PUBLIC_PREFIXES = ["/recipes", "/food-cost", "/journal", "/news", "/pre-opening", "/demo"];
const matches = (path: string, prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

export function isPublicPath(path: string) {
  return path === "/" || matches(path, PUBLIC_PREFIXES);
}

/** Refreshes the auth session cookie on every request and guards private routes. */
export async function updateSession(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const { url, key } = publicEnv();
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser() validates the token with Supabase Auth (not just decoding the cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && matches(path, PROTECTED_PREFIXES)) {
    return NextResponse.redirect(sameHostUrl(request, `/login?next=${encodeURIComponent(path + request.nextUrl.search)}`));
  }
  return response;
}
