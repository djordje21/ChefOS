import { describe, expect, it } from "vitest";
import { JOURNAL_ARTICLES, JOURNAL_CATEGORIES } from "@/experience/content/journal";
import { PUBLICATIONS } from "@/experience/content/news";
import { DEMO_TASKS, WORKSTREAMS } from "@/experience/content/preopening";
import { DESTINATIONS } from "@/experience/destinations";
import { isPublicPath } from "@/lib/supabase/session";

describe("cinematic experience", () => {
  it("offers exactly the five destinations, each on its own public route", () => {
    expect(DESTINATIONS.map((d) => d.href)).toEqual(["/recipes", "/food-cost", "/journal", "/news", "/pre-opening"]);
    for (const d of DESTINATIONS) expect(isPublicPath(d.href), d.href).toBe(true);
  });

  it("keeps private routes out of the public list", () => {
    for (const p of ["/app", "/app/w/x", "/account/password", "/invite/abc", "/auth/confirm", "/login", "/recipes-private", "/newsroom"]) {
      expect(isPublicPath(p), p).toBe(false);
    }
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/journal/some-article")).toBe(true);
  });

  it("journal has the six agreed categories and every article is a clearly marked placeholder", () => {
    expect(JOURNAL_CATEGORIES.map((c) => c.id)).toEqual(["techniques", "management", "food-cost", "leadership", "pre-opening", "career"]);
    const ids = new Set(JOURNAL_CATEGORIES.map((c) => c.id));
    const slugs = new Set<string>();
    for (const a of JOURNAL_ARTICLES) {
      expect(ids.has(a.category), a.slug).toBe(true);
      expect(a.status).toBe("placeholder");
      expect(a.slug).toMatch(/^[a-z0-9-]+$/);
      expect(slugs.has(a.slug)).toBe(false);
      slugs.add(a.slug);
    }
    for (const c of JOURNAL_CATEGORIES) expect(JOURNAL_ARTICLES.some((a) => a.category === c.id), c.id).toBe(true);
  });

  it("news directory only links to publisher home pages over https", () => {
    for (const p of PUBLICATIONS) {
      if (p.url === null) continue;
      const u = new URL(p.url);
      expect(u.protocol).toBe("https:");
      expect(u.pathname).toBe("/");
    }
  });

  it("pre-opening demo tasks reference real workstreams and existing dependencies", () => {
    const ids = new Set(DEMO_TASKS.map((t) => t.id));
    for (const t of DEMO_TASKS) {
      expect((WORKSTREAMS as readonly string[]).includes(t.workstream), t.id).toBe(true);
      for (const d of t.dependsOn) expect(ids.has(d), `${t.id} → ${d}`).toBe(true);
    }
  });
});
