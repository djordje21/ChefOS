import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEMO_WORKSPACES } from "@/demo/data";
import { evaluate } from "@/demo/model";

describe("interface demo", () => {
  it("every demo workspace evaluates through the real engine without validation errors", () => {
    for (const ws of DEMO_WORKSPACES) {
      const e = evaluate(ws);
      expect(e.ok, ws.id).toBe(true);
    }
  });

  it("shows a deliberately incomplete dish (missing price) and no invented figures", () => {
    const e = evaluate(DEMO_WORKSPACES[0]!);
    if (!e.ok) throw new Error(e.error);
    const risotto = e.dishes.find((d) => d.recipe.id === "risotto")!;
    expect(risotto.state).toBe("incomplete");
    expect(risotto.cost.issues.map((i) => i.code)).toContain("MISSING_PRICE");
    expect(e.dishes.filter((d) => d.state !== "incomplete").every((d) => d.cost.status !== "incomplete")).toBe(true);
  });

  it("never assumes a food-cost target that is not configured", () => {
    const ws = structuredClone(DEMO_WORKSPACES[0]!);
    ws.categories = ws.categories.filter((c) => c.name !== "Desserts");
    const e = evaluate(ws);
    if (!e.ok) throw new Error(e.error);
    const dessert = e.dishes.find((d) => d.dish.category === "Desserts")!;
    expect([dessert.state, dessert.target, dessert.pricing]).toEqual(["no_target", null, null]);
  });

  it("demo code is reachable only from the public demo routes and the preview build", () => {
    const root = path.resolve(import.meta.dirname, "../../src");
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]));
    const importers = walk(root)
      .filter((f) => !f.startsWith(path.join(root, "demo") + path.sep) && /\.(ts|tsx)$/.test(f))
      .filter((f) => readFileSync(f, "utf8").includes("@/demo/"))
      .map((f) => path.relative(root, f))
      .sort();
    expect(importers).toEqual([path.join("app", "food-cost", "page.tsx"), path.join("app", "recipes", "page.tsx")]);
  });
});
