# ChefOS — Implementation Plan (v2)

Status: **awaiting approval** of `04-architecture-assessment.md` (questions Q1–Q5).

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
| 1 | **Foundation, isolation-first:** auth, workspaces, outlets, memberships, roles/permissions, invitations, audit log, composite FKs, RLS | Isolation suite 6.1 green; you can sign up, create an empty workspace and invite a user |
| 2 | **Costing engine** + workspace configuration (policy versions, tax rates, units, conversions, categories) | Engine suite 6.2 (1–11) green |
| 3 | Ingredients, suppliers, supplier products, price lists, price approval | Price-change tests green; search, bulk edit and CSV/XLSX work |
| 4 | Recipe builder: versions, sub-recipes, scaling, allergens/tags, validation flags | Sub-recipe, scaling and snapshot tests green |
| 5 | Dishes and pricing (what-if), dashboard, price-change impact | Dashboard figures come from the database only |
| 6 | **Generic import framework:** column mapping, preview, report, idempotent re-import; ingredient list, supplier price list, full workbook. Onboarding paths | The source workbook imports into your private workspace and reproduces the workbook under the Excel-compatible policy |
| 7 | Demo workspace (content per Q1), templates (copy-on-create) | Demo is labelled, separate, resettable |
| 8 | Exports (technical sheet PDF/XLSX, costing reports, workbook export) + mobile polish | |
| 9 | Deployment guide; completed, incomplete and deferred feature list | |
| Later | Menu engineering with POS import → Pre-opening PM → Portfolio site → AI assistant | Each one reviewed separately |

## Data confidentiality

The repository is public. Customer data, including the source workbook and prices, is never committed. It lives only in the workspace database. Test fixtures in git are synthetic.
