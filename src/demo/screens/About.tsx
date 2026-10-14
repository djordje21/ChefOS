"use client";

import { Chip, Panel } from "../ui";

const ROWS: { area: string; status: "working" | "engine" | "prototype" | "missing"; detail: string }[] = [
  { area: "Sign up, email confirmation, sign in, sign out, password reset", status: "working", detail: "Real app (/login). Supabase Auth. Covered by Playwright E2E in CI (reset not yet E2E-tested)." },
  { area: "Workspaces, outlets, team, invitations, outlet permissions, audit log", status: "working", detail: "Real app. Database-enforced isolation (RLS), 79 database/security tests, E2E in CI." },
  { area: "Costing engine (units, yield, sub-recipes, allowance, VAT, rounding, pricing)", status: "working", detail: "src/lib/costing, 77 unit tests. Every figure in this preview is computed by it." },
  { area: "Recipe book (browse, read, new draft recipe)", status: "prototype", detail: "Fictional recipes. A new recipe lives in this browser tab only; costs on its cards come from the engine." },
  { area: "Food cost screen", status: "engine", detail: "Live calculations on fictional data. Edits stay in this browser tab; nothing is saved." },
  { area: "Dashboard", status: "engine", detail: "Figures recalculated from the demo data. Price-change impact uses the engine with old and new prices." },
  { area: "Ingredient master", status: "prototype", detail: "Fictional list. Editing a price shows the real recalculated effect, then updates the preview only." },
  { area: "Workspace settings (costing rules, targets, tax)", status: "prototype", detail: "Validated with the engine's own rule schema; versions are kept in memory only." },
  { area: "Workspace and outlet switcher", status: "prototype", detail: "Shows how data separates per workspace and filters per outlet. Real switching exists on /app." },
  { area: "Saving recipes, ingredients, prices, rules", status: "missing", detail: "Phase 2.2–4: database tables, history and snapshots. Not built yet." },
  { area: "Supplier price lists, imports, exports, allergens workflow", status: "missing", detail: "Later phases." },
];

const TAG = {
  working: <Chip tone="ok">Working</Chip>,
  engine: <Chip tone="info">Live engine · demo data</Chip>,
  prototype: <Chip tone="warn">Prototype</Chip>,
  missing: <Chip>Not built</Chip>,
};

export function About() {
  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">About this preview</p>
        <h1 className="display mt-1 text-2xl sm:text-[1.7rem]">What works and what is a prototype</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Every restaurant, supplier, price, rate and recipe in this demo is invented. Nothing you change here is saved or sent anywhere;
          reloading the page restores the original demo data.
        </p>
      </header>
      <Panel>
        <ul className="divide-y divide-line">
          {ROWS.map((r) => (
            <li key={r.area} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{r.area}</p>
                <p className="text-xs text-muted">{r.detail}</p>
              </div>
              <div className="sm:text-right">{TAG[r.status]}</div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
