# ChefOS

Professional kitchen management & food cost platform — multi-workspace, outlet-aware, security-first.

**Status:** Phase 1 foundation and Phase 2.0 security hardening done, green in CI (unit, database/security, local Supabase stack, Playwright E2E). Costing engine implemented as an isolated module. Not deployed. See [`docs/08-phase-2.0-status.md`](docs/08-phase-2.0-status.md).

## Quick start

```bash
npm ci
npm run db:local:start && export TEST_DATABASE_URL=postgresql://postgres@localhost:54329/postgres
npm test                      # unit + database/security tests on a fresh database
cp .env.example .env.local    # add your Supabase URL + publishable key, then:
npm run dev

# With Docker + Supabase CLI (local stack only):
supabase start
npm run db:types              # regenerate src/lib/supabase/database.types.ts after a migration
npm run build && npm run test:e2e   # see e2e/README.md
```

## Documentation

* `docs/10-ui-preview.md` — interface preview: routes, what is real vs prototype, how to run the demo
* `docs/11-cinematic-experience.md` — cinematic kitchen landing, the five destinations, placeholders and how to replace the temporary visuals
* `docs/08-phase-2.0-status.md` — current status: changes, tests, CI results, remaining risks
* `docs/09-costing-engine.md` — costing engine: definitions, configuration, guarantees
* `docs/07-phase1-status.md` — Phase 1 snapshot (file tree, commands)
* `docs/05-database-schema.md` — authoritative schema & security model
* `docs/06-supabase-setup.md` — Supabase setup, keys, what must never be committed
* `docs/04-architecture-assessment.md` — workspace model and decisions
* `docs/03-implementation-plan.md` — phases
* `docs/02-data-model.md` — data model overview
* `tools/workbook-audit/audit.py` — independent decimal re-calculation of a food cost workbook (`python3 -I tools/workbook-audit/audit.py <file.xlsx>`; requires `openpyxl`)

Business data (workbooks, prices, audit reports with prices) is intentionally kept out of this repository.
