import { afterEach, describe, expect, it, vi } from "vitest";
import { publicEnv } from "@/lib/env";

afterEach(() => vi.unstubAllEnvs());

describe("publicEnv", () => {
  it("refuses a Supabase secret key in the public slot", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", ["sb", "secret", "not-a-real-key-000"].join("_"));
    expect(() => publicEnv()).toThrow(/SECRET key/);
  });

  it("requires both public variables", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    expect(() => publicEnv()).toThrow(/Missing/);
  });
});
