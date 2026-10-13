/**
 * Public configuration only. The Supabase *publishable* key is designed to be
 * public; it is safe in the browser because every table is protected by RLS.
 * Secret keys must never be read here or prefixed with NEXT_PUBLIC_.
 */
export function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local.",
    );
  }
  if (key.startsWith("sb_secret_")) {
    throw new Error("A Supabase SECRET key was configured as the publishable key. Use the publishable key.");
  }
  return { url, key, siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "") };
}
