# ChefOS — Implementation Plan

Status: **awaiting approval** (see the open questions at the end of the audit report, Q1–Q9).

## Stack (as proposed in the brief; no change recommended)

| Layer | Choice | Why / trade-off |
|---|---|---|
| App | Next.js (App Router) + TypeScript + React + Tailwind | Server components and server actions keep authorization on the server |
| DB/Auth | Supabase (PostgreSQL, Auth, RLS, Storage) | RLS gives tenant isolation inside the database itself. Trade-off: you need a Supabase project (free tier is enough to start) |
| Money math | `decimal.js` in a pure TypeScript package `@chefos/costing` | One engine used by the UI, the API, exports and tests. Matches Excel ROUND (half away from zero) |
| Migrations | Supabase SQL migrations in git | Additive only; no destructive migration without your approval |
| Tests | Vitest (engine and import), Playwright (end-to-end), pgTAP or SQL tests for RLS | Fixtures from audit §5 |
| Exports | `exceljs` (XLSX), `@react-pdf/renderer` (technical sheets) | Both run server-side |
| Hosting | Vercel + Supabase | Backups: Supabase daily backups plus a scheduled `pg_dump` export |

## Phases

| Step | Deliverable | Done when |
|---|---|---|
| 1 ✅ | Workbook audit + independent re-calculation | Done: all values reconcile; issues and questions documented |
| 2–3 ✅ | Data model + this plan | Waiting for approval |
| 4 | Foundation: Next.js app, Supabase schema + RLS, auth, roles, org/outlet setup, audit log | You can sign up, create an org, invite a user; RLS tests pass |
| 4b | Workbook import: preview → commit, row-level report, idempotent re-import | The source workbook imports with a report; the totals reconcile to Excel (source workbook totals) |
| 5 | Ingredients (CRUD, price history, packs, search, bulk edit, CSV/XLSX) + Recipe builder (versions, sub-recipes, scaling, validation flags) | Tests T1–T7, T12–T16 pass |
| 6 | Dishes and pricing (VAT, targets, overrides, rounding mode, what-if), Dashboard, price-change impact | Tests T8–T11, T17–T18 pass |
| 7 | Full automated test suite, including permissions and organization isolation | CI green |
| 8 | Reconciliation report: app vs Excel, per dish | Zero unexplained differences |
| 9 | Exports (technical sheet PDF/XLSX, costing report XLSX, full workbook export) + UX polish, mobile | |
| 10 | Deployment guide + list of completed, incomplete and deferred features | |
| Later | Supplier offer comparison & menu engineering with POS import → Pre-opening PM → Portfolio site → AI assistant | Each one reviewed separately |

## Import principles

* The original workbook is never modified. Each import is a batch with a file hash and a preview.
* Nothing is merged, renamed or re-priced automatically. Suspected duplicates and anomalies are flagged for review.
* Totals are imported with the **current** workbook rules (net basis, 3% allowance everywhere, nearest rounding), so the first reconciliation is exact. Any rule change you approve is then applied as an explicit, logged step whose before/after impact can be seen.

## Confidential data

The GitHub repo is public. Workbook data, prices and the full audit stay out of git (`private/` is ignored) until you decide otherwise. Real data will live only in Supabase.
