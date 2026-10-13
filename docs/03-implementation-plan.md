# ChefOS — Implementation Plan (v2)

Status (14 Oct 2026): Phase 1 done and green in CI. Phase 2.0 (security hardening) done — see `08-phase-2.0-status.md`. Phase 2.1 costing engine implemented as an isolated module (`09-costing-engine.md`). Nothing deployed.

## Stack (unchanged)

| Layer | Choice |
|---|---|
| App | Next.js (App Router) + TypeScript + React + Tailwind |
| DB/Auth/Storage | Supabase (PostgreSQL, Auth, RLS, Storage) |
| Costing engine | Pure TypeScript package with `decimal.js`. No business constants; policy passed in |
| Migrations | SQL migrations in git, additive only; destructive changes only with explicit approval |
| Tests | Vitest (engine, importer), SQL/RLS tests against real Postgres, Playwright (end-to-end) |
| Exports | `exceljs`, `@react-pdf/renderer` (server-side) |
| Hosting | Vercel + Supabase; daily backups plus scheduled `pg_dump` |

## Phases

| # | Deliverable | Done when |
|---|---|---|
| 0 ✅ | Workbook audit, data model, architecture assessment | Approved by you |
| 1 ✅ | **Foundation, isolation-first** (see `07-phase1-status.md`): | Green in CI, incl. database tests on a local Supabase stack |
| 1a ✅ | Working login: sign-up with email confirmation, sign-in, sign-out, password reset, change password | Sign-up → email confirmation → sign-in → sign-out covered by Playwright E2E in CI; password reset not yet E2E-tested |
| 1b ✅ | Controlled workspace creation (confirmed email, plan limit, creator = owner of that workspace only) | DB tests |
| 1c ✅ | Invitations: hashed single-use tokens, email-bound, expiry, revoke, role + outlet grants, least privilege | DB tests |
| 1d ✅ | Membership management: change role, all-outlets / restricted, remove, leave, last-owner protection | DB tests |
| 1e ✅ | Outlet-level permissions separate from workspace permissions; outlet CRUD; per-outlet access | DB tests |
| 1f ✅ | Audit log (trigger-written, append-only), plans/limits (no billing) | DB tests |
| 1g ✅ | Automated security tests: catalog-generated isolation tests, RLS/grant invariants, composite-FK checks, mutation check proving the tests catch weakened protections, secret scan of repo and client bundle | 60 DB + 17 unit tests, 8/8 sabotages detected |
| 1h ✅ | CI on GitHub Actions; end-to-end browser tests (Playwright) against `supabase start` | Done in Phase 2.0 |
| 2.0 ✅ | **Security hardening** (audit H1, M1, M2): invitation re-validation and auto-revocation, no acceptance into suspended workspaces, deactivated outlets grant nothing; regression tests and mutation sabotages; Playwright E2E; generated DB types checked in CI | `08-phase-2.0-status.md` |
| 2.1 ✅ | **Costing engine** as a pure, isolated module (`src/lib/costing`, not wired to DB/UI) | `09-costing-engine.md`; unit suite green |
| 2.2 | Workspace configuration in the database (policy versions, tax rates, units, conversions, categories) + wiring the engine | Engine results stored as snapshots; isolation fixture covers new tables |
| 3 | Ingredients, suppliers, supplier products, prices with approval; preferred supplier (Supplier Intelligence foundations, schema per `05` §7) | Price-change tests green; search, bulk edit and CSV/XLSX work |
| 4 | Recipe builder: versions, sub-recipes, scaling, allergens/tags, validation flags | Sub-recipe, scaling and snapshot tests green |
| 5 | Dishes and pricing (what-if), dashboard, price-change impact | Dashboard figures come from the database only |
| 6 | **Generic import framework:** column mapping, preview, report, idempotent re-import; ingredient list, supplier price list, full workbook. Onboarding paths | The source workbook imports into your private workspace and reproduces the workbook under the Excel-compatible policy |
| 7 | Demo workspace (content per Q1), templates (copy-on-create) | Demo is labelled, separate, resettable |
| 8 | Exports (technical sheet PDF/XLSX, costing reports, workbook export) + mobile polish | |
| 9 | Deployment guide; completed, incomplete and deferred feature list | |
| Later | Supplier Intelligence full module (price-list import, comparison tables, approval queue, automatic impact) → Menu engineering with POS import → Pre-opening PM → Portfolio site → AI assistant | Each one reviewed separately |

## Data confidentiality

The repository is public. Customer data, including the source workbook and prices, is never committed. It lives only in the workspace database. Test fixtures in git are synthetic.
