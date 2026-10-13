import { describe, expect, it } from "vitest";
import {
  invitationSchema, newPasswordSchema, readOutletGrants, safeNextPath, signUpSchema, workspaceSchema,
} from "@/lib/validation";

const uuid = "6f1c3c1e-2b9a-4d7e-9d3f-0a1b2c3d4e5f";

describe("safeNextPath (open-redirect protection)", () => {
  it.each([
    ["/app", "/app"],
    ["/invite/abc?x=1", "/invite/abc?x=1"],
    ["//evil.example", "/app"],
    ["https://evil.example", "/app"],
    ["/\\evil.example", "/app"],
    ["javascript:alert(1)", "/app"],
    [null, "/app"],
    ["", "/app"],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});

describe("sign-up validation", () => {
  it("normalises email and requires a strong enough password", () => {
    const ok = signUpSchema.safeParse({ fullName: " Ana ", email: " Ana@Example.COM ", password: "kitchen-2026-ok" });
    expect(ok.success && ok.data).toEqual({ fullName: "Ana", email: "ana@example.com", password: "kitchen-2026-ok" });
    expect(signUpSchema.safeParse({ fullName: "A", email: "a@b.co", password: "short1" }).success).toBe(false);
    expect(signUpSchema.safeParse({ fullName: "A", email: "a@b.co", password: "onlyletterslong" }).success).toBe(false);
    expect(signUpSchema.safeParse({ fullName: "A", email: "not-an-email", password: "kitchen-2026-ok" }).success).toBe(false);
  });

  it("requires matching new passwords", () => {
    expect(newPasswordSchema.safeParse({ password: "kitchen-2026-ok", confirm: "kitchen-2026-ok" }).success).toBe(true);
    expect(newPasswordSchema.safeParse({ password: "kitchen-2026-ok", confirm: "kitchen-2026-no" }).success).toBe(false);
  });
});

describe("workspace validation", () => {
  it("upper-cases and checks the ISO currency code", () => {
    const r = workspaceSchema.safeParse({ name: "Bistro", baseCurrency: "rsd", locale: "sr", timezone: "Europe/Belgrade" });
    expect(r.success && r.data.baseCurrency).toBe("RSD");
    expect(workspaceSchema.safeParse({ name: "B", baseCurrency: "EURO", locale: "en", timezone: "UTC" }).success).toBe(false);
    expect(workspaceSchema.safeParse({ name: "   ", baseCurrency: "EUR", locale: "en", timezone: "UTC" }).success).toBe(false);
  });
});

describe("invitation form parsing", () => {
  it("reads per-outlet grants and ignores 'no access'", () => {
    const f = new FormData();
    f.set(`grant:${uuid}`, uuid);
    f.set("grant:11111111-2222-4333-8444-555555555555", "");
    f.set("email", "x@example.com");
    expect(readOutletGrants(f)).toEqual([{ outlet_id: uuid, role_id: uuid }]);
  });

  it("rejects malformed ids and out-of-range validity", () => {
    const base = { workspaceId: uuid, email: "x@example.com", roleId: uuid, allOutlets: true, outletGrants: [], validDays: 7 };
    expect(invitationSchema.safeParse(base).success).toBe(true);
    expect(invitationSchema.safeParse({ ...base, roleId: "owner" }).success).toBe(false);
    expect(invitationSchema.safeParse({ ...base, validDays: 365 }).success).toBe(false);
    expect(invitationSchema.safeParse({ ...base, outletGrants: [{ outlet_id: "x", role_id: uuid }] }).success).toBe(false);
  });
});
