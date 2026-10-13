# ChefOS

Professional kitchen management & food cost platform — multi-workspace, outlet-aware, security-first.

**Status:** Phase 1 (foundation: auth, workspaces, outlets, team, invitations, audit) implemented and tested locally. Not deployed. See [`docs/07-phase1-status.md`](docs/07-phase1-status.md).

## Quick start

```bash
npm ci
npm run db:local:start && export TEST_DATABASE_URL=postgresql://postgres@localhost:54329/postgres
npm test                      # unit + database/security tests on a fresh database
cp .env.example .env.local    # add your Supabase URL + publishable key, then:
npm run dev
```

## Documentation

* `docs/07-phase1-status.md` — what is implemented, tested, pending; file tree; commands; verification results
* `docs/05-database-schema.md` — authoritative schema & security model
* `docs/06-supabase-setup.md` — Supabase setup, keys, what must never be committed
* `docs/04-architecture-assessment.md` — workspace model and decisions
* `docs/03-implementation-plan.md` — phases
* `docs/02-data-model.md` — data model overview
* `tools/workbook-audit/audit.py` — independent decimal re-calculation of a food cost workbook (`python3 -I tools/workbook-audit/audit.py <file.xlsx>`; requires `openpyxl`)

Business data (workbooks, prices, audit reports with prices) is intentionally kept out of this repository.
