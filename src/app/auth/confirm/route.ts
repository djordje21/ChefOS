import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { relativeRedirect } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation";

/**
 * Landing point for email links (sign-up confirmation, password reset).
 * Supports both the token-hash template ({{ .TokenHash }}) and the PKCE code flow.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const supabase = await createClient();

  let ok = false;
  if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }
  return relativeRedirect(ok ? next : "/login?error=link");
}
