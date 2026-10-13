# ChefOS — Architecture Assessment: Universal Workspaces

Status: **approved 13 Oct 2026** (Q1–Q5 below, with clarifications). Detailed schema: `05-database-schema.md`. Setup: `06-supabase-setup.md`.

## 1. Current state of the codebase (inspected 13 Oct 2026)

| Item | State |
|---|---|
| Application code (Next.js, UI, API) | **None** |
| Database / migrations / Supabase project | **None** |
| Working features | None in the product sense. `tools/workbook-audit/audit.py` works: it is a one-off, read-only tool that re-calculates the source workbook |
| Documents | `docs/02-data-model.md` and `docs/03-implementation-plan.md` (first draft, now revised), plus the audit report in `private/` (git-ignored) |
| Data | No source workbook data is in git or in any database |

So there is nothing to migrate or break. "Preserving existing functionality" here means keeping the audit findings and the audit tool, and correcting the design documents **before** any code exists. That is the cheapest possible moment to make this change. No rebuild is needed.

## 2. Architecture assessment

The first-draft data model was already multi-tenant (`organization_id` + RLS on every table). It was still **shaped around the source workbook** in ways that would have become hardcoded behaviour:

* The settings were a single row with one VAT rate, one allowance, one rounding step: a copy of `Settings!B5:B7`.
* The acceptance criteria were defined as "reconciles to source workbook totals".
* The engine was designed around three units and "purchase price excl. VAT".
* Example currency and outlet names from the source workbook leaked into defaults.

The corrected architecture has three layers:

```
┌───────────────────────────────────────────────────────────────┐
│ SYSTEM REFERENCE (global, read-only, no business data)          │
│  physical units g/kg/ml/l/pcs + SI factors · ISO currencies ·   │
│  regulatory allergen lists (EU 14, UK 14, US 9) · permissions   │
├───────────────────────────────────────────────────────────────┤
│ STARTER TEMPLATES (optional, COPIED into a workspace, never     │
│  linked): e.g. "Serbia – restaurant" (RSD, VAT 20%/10%),         │
│  "EU generic", "Demo kitchen" sample data                       │
├───────────────────────────────────────────────────────────────┤
│ WORKSPACE (tenant) — owns ALL business data and rules           │
│  costing policy · tax rates · units & conversions · categories ·│
│  targets · ingredients · suppliers · prices · recipes · menus · │
│  outlets · members & roles · approval rules · reports           │
└───────────────────────────────────────────────────────────────┘
         ▲ pure costing engine: (workspace data + policy) → results
```

The **costing engine** is one pure TypeScript module. It contains no business constants, only unit physics (1 kg = 1000 g). Every rule it applies arrives as an input: a versioned `CostingPolicy` read from the workspace. That keeps the maths identical for everyone while letting each workspace choose its own rules.

## 3. Hardcoded assumptions that must be removed

| # | Assumption (source) | Where it had leaked | Replacement |
|---|---|---|---|
| H1 | Currency is RSD | `organizations.base_currency (RSD)` | Required choice when the workspace is created. Supplier prices may be in other currencies, converted with exchange rates the workspace enters itself (never fetched silently) |
| H2 | One VAT rate (20%) on menu prices | `org_settings.menu_vat_rate` | `tax_rates` table (name, rate, valid from/to), assignable per category or per dish. Workspace chooses whether menu prices are entered **tax-inclusive** (EU) or **tax-exclusive** (US) |
| H3 | Purchase prices are excl. VAT and input VAT is recoverable | Engine assumption | Workspace setting `input_tax_recoverable`. If false (business not VAT-registered), purchase VAT is part of the cost. Each price records whether it includes tax |
| H4 | 3% minor-items allowance applied to every dish | `default_allowance_rate` | Allowance policy: none / % per dish / % per category / per recipe override. Always applied once, at the outermost level |
| H5 | Round to nearest 10 (Excel `ROUND`) | `price_rounding_step/mode` | Policy: no rounding / step + mode (up, nearest, down) / optional price endings (e.g. .90, .99, 9) |
| H6 | Units are kg, l, pcs only | `units` table seeded globally | Global table holds only physical units. Each workspace adds its own (case, bunch, tray, portion…) and ingredient-specific conversions (1 egg = 60 g). Nothing converts implicitly |
| H7 | The source workbook's 12 categories and FC targets | Seed idea | A new workspace starts with **no categories** (or copies a template). Targets live per category, with dish overrides and validity dates |
| H8 | Diet labels V / VG / "VG opt." | Import mapping | Workspace-defined dietary tags. Allergen framework chosen per workspace (EU/UK/US), with "not declared" as the default and never inferred |
| H9 | Yield applies to "net" recipe quantities | Engine default | Workspace default quantity basis (net or as-purchased), overridable per recipe line |
| H10 | Menu engineering 70% popularity rule | Data model note | Configurable thresholds per workspace, documented on screen |
| H11 | "Reconcile to the source workbook totals" as product acceptance | Plan step 4b/8 | Becomes a **regression fixture** for the importer, not a product rule |
| H12 | Real outlet and business names from the source workbook | Docs examples | Removed. Outlets are workspace data |
| H13 | Workbook layout (sheet names, cell ranges) | `audit.py` | `audit.py` stays as a one-off tool. The product importer uses **column mapping**, with mappings saved per workspace; "the source workbook layout" is just one saved mapping |
| H14 | Price source = the one manual price | Engine | Policy: latest approved price / preferred supplier / chosen supplier per outlet |
| H15 | No approvals | — | Workspace rules: price-change threshold (e.g. a change above X% needs approval), supplier approval status, recipe approval roles |
| H16 | English UI + Serbian number formats | — | Locale per user (language), number/currency formats per workspace |

## 4. Workspace & data ownership model

* **Workspace = tenant.** It is the security boundary. A hotel is one workspace with several outlets; an independent restaurant is one workspace with one outlet.
* **Users exist globally; access does not.** A user may belong to several workspaces (for example a consultant). Each membership carries its own role. Roles are owner, executive_chef, editor and viewer, plus custom roles built from a permission catalog. Membership can also be limited to particular outlets.
* **Every business row has `workspace_id NOT NULL`.** Foreign keys are **composite**, `(workspace_id, id)`, so the database itself rejects a recipe line pointing at another workspace's ingredient. That holds even if application code has a bug.
* **Row-Level Security on every table:** `workspace_id IN (my memberships) AND has_permission(...)`. File storage paths are prefixed with `workspace_id` and protected by the same policies. The service-role key is used only in server-side jobs (import, export), and those jobs still filter by workspace explicitly.
* **No implicit sharing.** Templates and the demo workspace are **copied** into a workspace, never referenced. Cross-workspace sharing (for example a hotel group recipe library) is deferred. When it comes, it will be an explicit, auditable grant.
* **Data provenance.** Each record has `origin` (manual / import / template / demo), `import_batch_id` and `confirmed_at`. Imported or sample records show as **"unconfirmed"** until a user with permission confirms them.
* **Demo data lives in a separate demo workspace,** visibly labelled, and can be reset or deleted. It never becomes the default database.
* **Versioned policy.** `costing_policy_versions` and `tax_rates` have validity dates, and every costing snapshot stores which policy version it used, so past numbers can be reproduced exactly.

### Onboarding paths (a new workspace chooses one or more)

1. Start empty (optionally copy a regional starter template: currency, taxes, units only, with no ingredients).
2. Import an existing workbook: upload, map sheets and columns, preview, commit, review the report.
3. Upload an ingredient list (CSV/XLSX).
4. Import supplier price lists, mapped to existing ingredients by supplier product code or name, with a review step.
5. Create ingredients, suppliers and recipes manually.
6. Open the demo workspace to explore. It stays separate.

## 5. Migration plan

There is no live code or data, so no data migration is needed. The plan:

| Step | Action | Risk |
|---|---|---|
| M1 | Revise `docs/02-data-model.md` to the workspace model above (done in this commit) | None |
| M2 | Revise `docs/03-implementation-plan.md` (done in this commit) | None |
| M3 | Keep `tools/workbook-audit/audit.py` and the private audit unchanged. Its findings become importer validation rules (duplicate detection, zero quantity, unit mismatch, case mismatch) | None |
| M4 | Build the foundation **isolation-first**: workspace tables, composite FKs, RLS and the isolation test suite are written before any feature screens | — |
| M5 | Import the source workbook through the generic importer, into **your own private workspace**, as the first real-world acceptance test. The workbook-total reconciliation becomes a private fixture | Real prices must not end up in the public repo (see Q1) |

## 6. Required tests

### 6.1 Workspace isolation (run against a real Postgres with RLS enabled, as each role)

1. User A cannot **select, insert, update or delete** any row in workspace B, for every table. The test is generated from the schema, so new tables are covered automatically.
2. Inserting a recipe line in workspace A that references an ingredient, sub-recipe, supplier or tax rate from workspace B fails at the **database** level (composite FK), even when sent with the service role.
3. Server actions and API routes given a forged `workspace_id` return 403/404 and never leak data.
4. Search, autocomplete, dashboard aggregates, exports (XLSX/PDF) and audit-log views contain only the caller's workspace data.
5. Storage: files under another workspace's prefix cannot be read or written.
6. Import jobs write only into the target workspace, and re-import never touches another workspace.
7. A user who belongs to two workspaces sees each one separately. Switching workspace changes all data.
8. A removed member loses access immediately, including existing sessions on their next request.
9. Role permissions: a viewer cannot edit, an editor cannot approve, only an owner manages members. Outlet-scoped members see only their outlets.
10. Copying a template or the demo workspace creates independent rows. Editing the copy never changes the source, and vice versa.
11. The service-role key never appears in the client bundle (build-output scan).

### 6.2 Costing accuracy (pure engine, decimal; fixtures independently calculated)

1. Unit conversion: kg→g, l→ml, custom units, ingredient-specific conversion. A **missing conversion is an error, never a guess**.
2. Pack sizes: 5 kg carton, 10 l container, case of 24.
3. Yield applied exactly once. Net vs as-purchased basis, per-line override.
4. Recipe cost, batch yield and portions; scaling linearity (property-based test: cost(k·r) = k·cost(r)).
5. Sub-recipes: the costed result equals the flattened recipe; no double count; cycle detection.
6. Allowance policies: none, dish-level, category-level, override; never applied inside sub-recipes.
7. Tax: inclusive vs exclusive menu pricing; multiple rates; rates with validity dates; recoverable vs non-recoverable input tax.
8. Multi-currency supplier prices with workspace-entered exchange rates.
9. Suggested price for every rounding mode and step, plus price endings. Excel half-away-from-zero behaviour checked.
10. FC %, contribution, target overrides, status thresholds.
11. Completeness: missing price, zero price, zero quantity, invalid yield, missing conversion, unknown ingredient.
12. Price change: the affected recipes and dishes are found, the old vs new values are correct, approval threshold behaviour.
13. Snapshots: a snapshot recomputed later with its stored policy version and prices gives the same result, even after the policy has changed.
14. Regression fixture: the source workbook import reproduces the workbook exactly under an "Excel-compatible" policy (nearest rounding, 3% allowance on all, net basis). Kept private if Q1 says so.

## 7. Questions for you

| # | Question | My recommendation |
|---|---|---|
| Q1 | The source workbook data holds real prices and recipes, and the repo is public. What should the **demo workspace** contain? | A synthetic demo menu (realistic but invented prices). The real workbook gets imported by you into your own private workspace through the importer. |
| Q2 | Can one user belong to several workspaces (consultant model)? | Yes |
| Q3 | Hotel = one workspace with outlets, with members optionally limited to particular outlets? | Yes. Cross-workspace sharing deferred |
| Q4 | Self sign-up with workspace creation, or invite-only for now? | Self sign-up; billing deferred |
| Q5 | The earlier Q1–Q9 audit questions now become **per-workspace settings**. Are you happy for them to be answered as settings in your own workspace rather than as product rules? | Yes |

### Decisions (13 Oct 2026)

1. Demo = fictional data only. No real workbook prices or business information in the repo or the demo. The owner imports the real workbook privately.
2. Multiple workspaces per user, with independent roles. Consultants work across clients with no cross-exposure.
3. Hotel = one workspace with many outlets. Outlet-level permissions are separate from workspace-level ones. Ingredients and suppliers are shared; recipes, menus, selling prices and reports can be outlet-specific.
4. Open registration with email verification, controlled workspace creation and least privilege. No automatic admin rights. Plans and limits are modelled; no billing in Phase 1.
5. Every costing rule is configurable per workspace and versioned. Historical calculations are reproducible from the settings and approved prices of their period.
6. Supplier Intelligence is designed into the schema now (see `05` §7) and built after the foundation.
