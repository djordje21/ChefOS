# ChefOS — Interface Preview (product design milestone)

Status: **for review**. No migrations and no real business data were added in this milestone.

## Where to look

* **Hosted preview (private link):** https://claude.ai/artifact/FwV9SR2EPkA38NW4p8uj9w. It is the same demo as `/demo`, built into one page by `scripts/build-preview.mjs`. Only you can open it until you share it from the page's Share menu.
* **Locally:** see "Run it on your computer" below.

## Every route

| Route | Screen | Status |
|---|---|---|
| `/login`, `/signup`, `/forgot-password` | Sign in, create account, reset password | **Working** (Supabase Auth). Redesigned in this milestone |
| `/auth/confirm`, `/auth/signout` | Email-link landing, sign-out | **Working** (no UI) |
| `/account/password` | Change password | **Working** |
| `/app` | Workspace list and create workspace (= workspace selection) | **Working** |
| `/app/w/[id]` | Workspace overview and basic settings (name, language, time zone) | **Working** |
| `/app/w/[id]/outlets` | Outlets: create, rename, deactivate | **Working** |
| `/app/w/[id]/members` | Team, roles, outlet access, invitations | **Working** |
| `/app/w/[id]/audit` | Audit log | **Working** |
| `/invite/[token]` | Accept an invitation | **Working** |
| `/demo` (only when `NEXT_PUBLIC_ENABLE_DEMO=1`) | Demo of the screens below | See next table |

Screens inside the demo:

| Screen | What is real | What is not |
|---|---|---|
| **Recipe costing** (primary) | Every figure is computed by the real engine (`src/lib/costing`): line costs with net/gross basis and yield, sub-recipes, allowance, cost per portion, scaling, food cost on the net price, suggested price with the workspace's rounding rule, contribution. Inputs reject invalid numbers | Data is fictional and kept only in the browser tab. No versions, approvals or saving |
| **Dashboard** | KPIs, food cost against target, dishes needing attention, and the price-change impact (recomputed with old vs new prices), all computed from the demo data | No sales data, no history beyond the fictional previous prices |
| **Ingredient master** | Usable cost per kg/l/piece; editing a price, pack, tax or yield shows the recalculated effect on dishes before applying | Fictional list. "Apply" changes the preview only. No suppliers database, approvals or imports |
| **Workspace settings** | Costing rules validated with the engine's own schema. A new version is applied to every recipe immediately; tax rate and category targets are editable | Kept in memory only |
| **Workspace and outlet selection** | Switching between two fictional workspaces shows completely separate data; the outlet filter narrows recipes and the dashboard | Real switching and permissions live on `/app` |
| **What works?** | In-app list of the above | — |

The whole demo is labelled on every screen ("Demo mode · fictional … · nothing is saved"), and each screen carries a *Live engine · demo data* or *Prototype* tag.

## Security

* `/demo` returns 404 unless `NEXT_PUBLIC_ENABLE_DEMO=1`. It makes no database or Auth calls and needs no credentials.
* Production auth and RLS are unchanged. A unit test fails if any real app code other than `app/demo/page.tsx` imports the demo module.
* All demo data is invented (`src/demo/data.ts`). None of it is a default for real workspaces, and the demo assumes no food-cost target: a dish without one shows "No target set".

## What was verified, and how

* **Opened in Chromium** (Playwright, against `next build && next start`):
  * Recipe costing at 1440 px and 1680 px (light and dark) and at 390 px (phone).
  * Dashboard (desktop light, phone dark), Ingredient master with the editor open, Settings, What works?.
  * The real `/login` (desktop) and `/signup` (phone, dark).
  * No console errors and no horizontal page overflow on any of them.
* **Interactions checked:**
  * Changing a quantity recalculates the dish: 210 → 260 g chicken gives €3.70 → €4.18 per portion and 15.7 % → 17.7 % food cost. This matches a hand calculation.
  * "Use suggested price" sets €15.00, giving 30.7 % against a 31 % target.
  * An invalid quantity is rejected with a message.
  * Switching workspace shows only that workspace's data.
  * The outlet filter narrows the recipe list.
* **Hosted preview:** the published page was opened in Chromium in light and dark at desktop and phone widths, with no errors. This environment cannot reach cdnjs, so the identical React 18.3.1 files were served locally for that check.
* **Not visually inspected here:** the signed-in real pages (`/app/...`). They need a running Supabase Auth, and this environment has no Docker. Their behaviour is covered by the Playwright E2E job in CI.

## Run it on your computer

Prerequisites: Git and Node.js 22 (https://nodejs.org).

```bash
git clone https://github.com/djordje21/ChefOS.git
cd ChefOS
git checkout claude/chefos-kitchen-platform-qc07o0
npm ci
```

Create a file named `.env.local` in the project folder with:

```
NEXT_PUBLIC_ENABLE_DEMO=1
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_placeholder
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The two Supabase values are placeholders, and the demo does not use them. Then:

```bash
npm run build
npm start
```

Open http://localhost:3000/demo. The sign-in pages at http://localhost:3000/login render too, but signing in needs a Supabase project (local `supabase start` or your `chefos-dev`; see `docs/06-supabase-setup.md`).

To rebuild the single-file hosted preview: `node scripts/build-preview.mjs`. It writes to `preview/dist/` (git-ignored).
