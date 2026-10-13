# ChefOS — Phase 1 Status (verified 13 Oct 2026)

This document separates what is **implemented and tested**, what is **implemented but not yet verified against real Supabase**, and what is **documentation / planned**. Nothing has been deployed. No production credentials were used or needed.

## 1. Repository file tree

(`package-lock.json` omitted. `node_modules/`, `.next/`, `.env.local`, `private/` are git-ignored.)

```
ChefOS/
├── .github/
│   └── workflows/
│       └── ci.yml
├── docs/
│   ├── 02-data-model.md
│   ├── 03-implementation-plan.md
│   ├── 04-architecture-assessment.md
│   ├── 05-database-schema.md
│   ├── 06-supabase-setup.md
│   └── 07-phase1-status.md
├── scripts/
│   ├── check-secrets.mjs
│   ├── local-postgres.sh
│   └── security-mutation-check.sh
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── signup/
│   │   │   │   ├── page.tsx
│   │   │   │   └── signup-form.tsx
│   │   │   ├── actions.ts
│   │   │   └── layout.tsx
│   │   ├── account/
│   │   │   └── password/
│   │   │       └── page.tsx
│   │   ├── app/
│   │   │   ├── w/
│   │   │   │   └── [workspaceId]/
│   │   │   │       ├── audit/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── members/
│   │   │   │       │   ├── invite-form.tsx
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── outlets/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── layout.tsx
│   │   │   │       └── page.tsx
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── auth/
│   │   │   ├── confirm/
│   │   │   │   └── route.ts
│   │   │   └── signout/
│   │   │       └── route.ts
│   │   ├── invite/
│   │   │   └── [token]/
│   │   │       └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── action-form.tsx
│   │   ├── app-header.tsx
│   │   └── ui.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts
│   │   │   └── session.ts
│   │   ├── auth.ts
│   │   ├── env.ts
│   │   ├── errors.ts
│   │   ├── options.ts
│   │   └── validation.ts
│   └── proxy.ts
├── supabase/
│   ├── migrations/
│   │   ├── 20261013000100_foundation_schemas.sql
│   │   ├── 20261013000200_system_reference.sql
│   │   ├── 20261013000300_identity_and_workspaces.sql
│   │   ├── 20261013000400_audit_log.sql
│   │   ├── 20261013000500_access_helpers.sql
│   │   ├── 20261013000600_rls_policies.sql
│   │   ├── 20261013000700_rpc_workspace_access.sql
│   │   └── 20261013000800_grants.sql
│   └── config.toml
├── tests/
│   ├── db/
│   │   ├── support/
│   │   │   └── supabase-stub.sql
│   │   ├── audit.test.ts
│   │   ├── fixtures.ts
│   │   ├── global-setup.ts
│   │   ├── helpers.ts
│   │   ├── invitations.test.ts
│   │   ├── isolation.test.ts
│   │   ├── members.test.ts
│   │   ├── outlets.test.ts
│   │   ├── registration.test.ts
│   │   └── schema.test.ts
│   └── unit/
│       ├── env.test.ts
│       ├── errors.test.ts
│       └── validation.test.ts
├── tools/
│   └── workbook-audit/
│       └── audit.py
├── .env.example
├── .gitignore
├── README.md
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── vitest.config.ts
```

## 2. Where things are

| What | Path |
|---|---|
| **Database migrations** (applied in filename order) | `supabase/migrations/20261013000100_foundation_schemas.sql` — `private` schema, revoke Supabase default grants |
| | `supabase/migrations/20261013000200_system_reference.sql` — permission catalog, plans |
| | `supabase/migrations/20261013000300_identity_and_workspaces.sql` — profiles, workspaces, roles, role permissions, memberships, outlets, outlet memberships, invitations; sign-up trigger |
| | `supabase/migrations/20261013000400_audit_log.sql` — audit table + triggers |
| | `supabase/migrations/20261013000500_access_helpers.sql` — permission resolution helpers, outlet limit |
| | `supabase/migrations/20261013000600_rls_policies.sql` — **all RLS policies** |
| | `supabase/migrations/20261013000700_rpc_workspace_access.sql` — workspace creation, invitations, member and outlet-access RPCs |
| | `supabase/migrations/20261013000800_grants.sql` — explicit, deny-by-default privileges |
| SQL schema documentation | `docs/05-database-schema.md` (authoritative design, incl. future phases); `docs/02-data-model.md` (overview) |
| Local Supabase config (CI) | `supabase/config.toml` |
| Supabase test stand-in (tests only, never deployed) | `tests/db/support/supabase-stub.sql` |
| **Database / security tests** | `tests/db/*.test.ts` (schema, registration, isolation, invitations, members, outlets, audit); harness `tests/db/global-setup.ts`, `tests/db/helpers.ts`, `tests/db/fixtures.ts` |
| Mutation check (proves tests catch weakened security) | `scripts/security-mutation-check.sh` |
| Unit tests | `tests/unit/*.test.ts` |
| Secret / confidential-data scanner | `scripts/check-secrets.mjs` |
| CI | `.github/workflows/ci.yml` (written, **not yet run**) |
| **Supabase setup documentation** | `docs/06-supabase-setup.md` |
| Application code | `src/` (Next.js App Router; `src/proxy.ts` refreshes sessions and guards private routes) |

## 3. Implemented vs. not

### Implemented and verified locally

| Feature | Evidence |
|---|---|
| Schema, RLS, composite FKs, grants | 8 migrations apply cleanly to an empty PostgreSQL 16 database; schema invariant tests |
| Sign-up creates a profile only; no automatic privileges | `registration.test.ts` |
| Controlled workspace creation (confirmed email, plan limit, owner of own workspace only) | `registration.test.ts` |
| Workspace isolation for every table and every RPC | `isolation.test.ts` (table list generated from the catalog) |
| Invitations (hashed, single-use, email-bound, expiry, revoke, least privilege) | `invitations.test.ts` |
| Membership management (role change, restrict to outlets, remove, leave, last owner) | `members.test.ts` |
| Outlet-level permissions separate from workspace permissions | `outlets.test.ts` |
| Audit log (trigger-written, append-only, `audit.view` only) | `audit.test.ts` |
| Multi-workspace users (consultant) | `isolation.test.ts` |
| Test suite actually detects broken security | `security-mutation-check.sh`: 8/8 sabotages detected |
| App compiles, lints, type-checks; routes guard correctly | `next build`; `next start` smoke test: `/app`, `/account/password`, `/invite/…` redirect to `/login?next=…`; security headers present; `Referrer-Policy: no-referrer` on invitation pages |
| Validation, open-redirect protection, error sanitising, secret-key guard | `tests/unit/*` |

### Implemented, NOT yet verified end-to-end

| Item | Why | How it gets verified |
|---|---|---|
| Sign-up → confirmation email → sign-in → create workspace → invite → accept, in the browser | Needs a running Supabase Auth (GoTrue). This environment has no Docker and cannot reach supabase.com | Your `chefos-dev` project, or the `supabase` CI job; then Playwright end-to-end tests (next step) |
| Database tests against real Supabase internals (instead of the stand-in `auth` schema) | Same | CI job `supabase` in `.github/workflows/ci.yml` |
| GitHub Actions workflow itself | Not run yet | First push to GitHub runs it (it contains no deploy step and needs no secrets) |

### Documentation / planned only

Costing engine, units, ingredients, suppliers and Supplier Intelligence, recipes, dishes, menus, imports, demo workspace, exports, deployment workflow (Phases 2–9 in `docs/03-implementation-plan.md`). Playwright end-to-end tests. Branded email templates, CAPTCHA, custom SMTP (dashboard settings, `docs/06`).

## 4. Commands

Prerequisites: Node.js ≥ 20.9 (tested on 22); for database tests, PostgreSQL 15+ server binaries **or** any local PostgreSQL where you are a superuser.

```bash
npm ci

# Database tests (local PostgreSQL only — the harness refuses hosted Supabase URLs)
npm run db:local:start                 # starts a throwaway cluster, prints the URL
export TEST_DATABASE_URL=postgresql://postgres@localhost:54329/postgres
npm run test:db                        # fresh database → stub → all migrations in order → 60 tests → dropped
bash scripts/security-mutation-check.sh

# Everything else
npm run check:secrets
npm run lint
npm run typecheck
npm run test:unit
npm test                               # unit + db

# Run the app (needs a Supabase project: local `supabase start` or chefos-dev)
cp .env.example .env.local             # fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev                            # http://localhost:3000
npm run build && npm run check:bundle  # production build + scan of what browsers download

npm run db:local:stop
```

Applying migrations to a Supabase project (only after you approve; not done yet): `supabase link --project-ref <ref>` then `supabase db push`, or the GitHub workflow described in `docs/06`.

## 5. Clean-environment verification

Procedure: fresh `git clone` of commit `a7fdaec` into an empty directory → `npm ci` → new PostgreSQL 16 cluster on a fresh port → commands in CI order. Results:

| Step | Result |
|---|---|
| `npm run check:secrets` | ✓ 76 files scanned, no secrets or forbidden files |
| `npm run lint` | ✓ 0 errors, 0 warnings |
| `npm run typecheck` | ✓ |
| `npm run test:unit` | ✓ 17/17 |
| `npm run test:db` (fresh DB, 8 migrations applied in order) | ✓ 60/60; test databases dropped afterwards (0 left) |
| `npm run build` | ✓ Next.js 16.4.0 |
| `npm run check:bundle` | ✓ 17 client files, no secrets |
| `scripts/security-mutation-check.sh` | ✓ 8/8 sabotages detected |
| `npm audit --omit=dev` | 0 vulnerabilities in production dependencies. Dev-only: 5 "high" findings in `braces` via `eslint-config-next` (lint tooling, not shipped) |

### Database tests (60)

```
isolation.test.ts > workspace isolation (generated for every workspace-scoped table) > the fixture populates every workspace-scoped table, so no check below is vacuous
isolation.test.ts > workspace isolation (generated for every workspace-scoped table) > every member role of B sees zero rows of A in every table
isolation.test.ts > workspace isolation (generated for every workspace-scoped table) > B's owner cannot update or delete any row of A
isolation.test.ts > workspace isolation (generated for every workspace-scoped table) > B's owner cannot insert outlets into A
isolation.test.ts > workspace isolation (generated for every workspace-scoped table) > B's owner cannot use any RPC against A
isolation.test.ts > workspace isolation (generated for every workspace-scoped table) > B cannot grant A's roles or outlets inside B (role/outlet ids are workspace-checked)
isolation.test.ts > workspace isolation (generated for every workspace-scoped table) > the database rejects cross-workspace references even for a superuser (composite FKs)
isolation.test.ts > workspace isolation (generated for every workspace-scoped table) > an invitation token for A gives nothing in B and cannot be reused
isolation.test.ts > one user in several workspaces (consultant) > roles are independent per workspace and data never mixes
schema.test.ts > migrations > are uniquely named, timestamp-ordered SQL files
schema.test.ts > schema security invariants > every table in public has row-level security enabled
schema.test.ts > schema security invariants > anon has no privilege on any table, sequence or function in public
schema.test.ts > schema security invariants > authenticated cannot delete from any table (deletes go through checked RPCs)
schema.test.ts > schema security invariants > every business table carries a NOT NULL workspace_id
schema.test.ts > schema security invariants > every foreign key between workspace-scoped tables includes workspace_id (composite)
schema.test.ts > schema security invariants > every SECURITY DEFINER function pins its search_path
schema.test.ts > schema security invariants > the invitation token hash is never readable through the API
schema.test.ts > schema security invariants > the private schema exposes only the RLS helpers to authenticated
members.test.ts > membership management > lists members; emails only for member.manage or yourself
members.test.ts > membership management > owner changes a member's role; the change applies immediately
members.test.ts > membership management > only member.manage can change members, and nobody can change themselves
members.test.ts > membership management > members cannot write memberships directly
members.test.ts > membership management > the last owner can be neither demoted nor removed, nor leave
members.test.ts > membership management > a removed member loses access immediately
members.test.ts > membership management > a member can leave a workspace
members.test.ts > membership management > removing a member also removes their outlet access
members.test.ts > membership management > a suspended membership has no access
members.test.ts > membership management > a suspended workspace is invisible to its members
outlets.test.ts > outlet-level permissions > all-outlet members see every outlet; restricted members only their own
outlets.test.ts > outlet-level permissions > outlet permissions resolve per outlet; workspace permissions only from the workspace role
outlets.test.ts > outlet-level permissions > only outlet.manage can create or rename outlets
outlets.test.ts > outlet-level permissions > outlet names are unique per workspace, case-insensitively
outlets.test.ts > outlet-level permissions > granting and revoking outlet access takes effect immediately
outlets.test.ts > outlet-level permissions > switching a member between all outlets and restricted access
outlets.test.ts > outlet-level permissions > a workspace role cannot be used as an outlet role and vice versa
outlets.test.ts > outlet-level permissions > enforces the plan outlet limit
invitations.test.ts > invitations > only members with member.manage can invite
invitations.test.ts > invitations > stores only a hash of the token, never the token
invitations.test.ts > invitations > accepting creates exactly the invited role and outlet access
invitations.test.ts > invitations > is single-use
invitations.test.ts > invitations > must be accepted by the invited email address, confirmed
invitations.test.ts > invitations > matches email case-insensitively
invitations.test.ts > invitations > revoked and expired invitations cannot be accepted
invitations.test.ts > invitations > re-inviting the same email replaces the open invitation
invitations.test.ts > invitations > unknown tokens reveal nothing; anonymous users cannot look tokens up
invitations.test.ts > invitations > rejects existing members and invalid input
invitations.test.ts > least privilege when inviting > a manager cannot grant a role with more permissions than their own
invitations.test.ts > least privilege when inviting > a manager restricted to some outlets cannot grant all-outlet access or other outlets
invitations.test.ts > least privilege when inviting > outlet roles can never hold workspace-level permissions
audit.test.ts > audit log > records who did what for access changes
audit.test.ts > audit log > is readable only with audit.view, and never writable
registration.test.ts > registration and workspace creation > sign-up creates a profile and nothing else
registration.test.ts > registration and workspace creation > an unconfirmed email cannot create a workspace
registration.test.ts > registration and workspace creation > anonymous callers cannot create workspaces or read anything
registration.test.ts > registration and workspace creation > the creator becomes Owner of the new workspace only, with all outlets
registration.test.ts > registration and workspace creation > a new workspace starts empty apart from its editable system roles
registration.test.ts > registration and workspace creation > validates currency and time zone
registration.test.ts > registration and workspace creation > enforces the plan limit on owned workspaces
registration.test.ts > registration and workspace creation > users can update only their own profile, and only safe columns
registration.test.ts > registration and workspace creation > workspace settings are editable only with workspace.settings, and not plan/owner fields
```

## 6. Confidentiality check

* **Secrets:** none in the repository or in the client bundle (scanner above; it fails CI on Supabase secret keys, access tokens, JWTs, database URLs with passwords, private keys, `.env` files).
* **Source workbook data:** the workbook, the full audit report and all price data live only in the git-ignored `private/` folder and were never committed. Excel files are git-ignored and rejected by the scanner. `tools/workbook-audit/audit.py` contains only calculation logic, no data. Test fixtures are synthetic.
* **Git history:** a search of every commit found **no prices or supplier data**. Earlier documentation commits (`7a53927`, `0201fa8`, `65cc0a7`) mention the hotel and outlet names and one aggregate menu-cost total from the workbook. These have been removed from the current files. They remain in the history of the branch until it is rewritten (needs your approval: force-push of `claude/chefos-kitchen-platform-qc07o0`).
