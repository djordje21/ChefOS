# ChefOS — Supabase Setup & Credentials

Dashboard menu names change from time to time. If a label below doesn't match exactly, look for the closest equivalent.

## 1. Create the projects

1. Sign in at https://supabase.com/dashboard and create an **Organization** (e.g. "ChefOS"). The Free plan is enough for development.
2. Create the project **`chefos-dev`**:
   * **Region: Central EU (Frankfurt)**. It is closest to Belgrade and keeps data in the EU (GDPR).
   * **Database password:** generate a long random one and store it **only in your password manager**. You need it for migrations, never for the app.
   * Enable the Data API (default). Leave "automatic RLS" or similar options at their defaults; our migrations enable RLS explicitly on every table.
3. Later, before any real customer data: create **`chefos-prod`** the same way, on a **paid plan**. Free projects pause after a period of inactivity and have limited backups; check the current terms on the pricing page. Dev and prod must never share keys.

## 2. Authentication settings (do these on both projects)

| Where (Dashboard → Authentication) | Setting |
|---|---|
| Sign In / Providers → **Email** | Enabled. **Confirm email = ON.** Secure email change = ON. Minimum password length **12**, require letters + digits |
| Sign In / Providers → others | Leave **off** (no anonymous sign-ins, no phone, no social logins for now) |
| Sign In / Providers → **Allow new users to sign up** | ON (open registration, as approved) |
| **URL Configuration** | Site URL = `http://localhost:3000` for dev (the production domain on prod). Redirect URLs: `http://localhost:3000/**`, and later the Vercel preview pattern and the production domain |
| **Attack Protection** | Turn on CAPTCHA (Cloudflare Turnstile or hCaptcha) before the app is public. Leaked-password protection if your plan offers it |
| **Emails → SMTP** | The built-in sender is heavily rate-limited and meant for testing only. Before real users, connect your own SMTP (Resend, Postmark, Amazon SES…) using a domain you own |
| **Emails → Templates** | Confirm signup, Invite, Magic link, Reset password: we'll supply ChefOS-branded templates in Phase 1 |
| Sessions / MFA | Default for now; TOTP MFA for owners comes later |

## 3. Keys and credentials

Dashboard → **Project Settings → API Keys** (keys) and the **Connect** button at the top of the dashboard (database connection strings).

| Credential | Looks like | Secret? | Where it belongs | Never |
|---|---|---|---|---|
| **Project URL** | `https://<ref>.supabase.co` | No | `.env.local`, Vercel: `NEXT_PUBLIC_SUPABASE_URL` | — |
| **Publishable key** (legacy name: `anon` key) | `sb_publishable_…` (legacy: a long JWT) | **No**: designed to be public. It is safe in the browser **only because every table has RLS** | `.env.local`, Vercel: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | — |
| **Secret key** (legacy: `service_role`) | `sb_secret_…` | **YES: bypasses RLS completely** | Only server-side environment variables (`SUPABASE_SECRET_KEY`) for specific admin jobs. **Phase 1 does not need it at all**: sign-up, workspace creation and invitations run as the signed-in user through RLS-checked functions | Never in git, never with the `NEXT_PUBLIC_` prefix, never in client code, never in chat, never in logs |
| **Database password / connection string** | `postgresql://postgres.<ref>:<password>@…` | **YES**: full database access | Your password manager. GitHub Actions secret `SUPABASE_DB_PASSWORD` for the migration job | Never in the app, git or chat |
| **Personal access token** (Account → Access Tokens) | `sbp_…` | **YES**: controls all your projects | Your machine (`supabase login`). GitHub Actions secret `SUPABASE_ACCESS_TOKEN` | Never in git or chat |
| **Project ref** | 20 characters, from the URL | No | GitHub Actions variable `SUPABASE_PROJECT_REF` | — |
| JWT secret / JWT signing keys | — | **YES** | Leave them inside Supabase; the app doesn't need them | Never copy them anywhere |

Rules enforced in the repository:
* `.gitignore` ignores `.env*` except `.env.example`, which contains **names only, no values**.
* A CI step scans the client build output and fails if it contains `sb_secret_`, `service_role`, `sbp_` or `postgresql://`.
* If a secret is ever exposed: rotate it immediately in the dashboard (API Keys → create a new secret key, revoke the old one; reset the database password; revoke the access token).

## 4. How migrations get to Supabase

This cloud coding environment **cannot reach supabase.com** (blocked by its network policy), and you should not hand me production credentials anyway. The recommended flow:

1. I write migrations in `supabase/migrations/*.sql` and test them here against a local PostgreSQL (with Supabase-compatible `auth` stubs). The same tests also run in GitHub Actions against a full local Supabase stack.
2. A GitHub Actions workflow runs on merge to `main`: `supabase link --project-ref $SUPABASE_PROJECT_REF` and then `supabase db push`, using the repository secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`. Production gets a separate workflow with manual approval (a GitHub "environment" with required reviewers).
3. Alternatively, you run `supabase db push` yourself from your computer.

Setting the secrets: GitHub → repository **Settings → Secrets and variables → Actions** → *New repository secret*: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`; *Variables*: `SUPABASE_PROJECT_REF`.

(Optional) If you want me to run read-only checks against the dev project from this cloud environment, allow `*.supabase.co` and `api.supabase.com` in the environment's network settings and store a token as an environment secret there. Never paste it into the chat. This is not required.

## 5. Vercel (when we deploy, after Phase 1 testing)

Project → Settings → Environment Variables:
* Production: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` from **chefos-prod**.
* Preview / Development: the same names from **chefos-dev**.
* `SUPABASE_SECRET_KEY` only if a later phase needs it, as a **Sensitive** variable, Production only.

## 6. Checklist for you

- [ ] Supabase org + `chefos-dev` (Frankfurt), DB password in password manager
- [ ] Auth settings from §2 (email confirm ON, password ≥ 12, sign-up ON, URLs)
- [ ] Personal access token created and stored in your password manager
- [ ] GitHub secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`; variable `SUPABASE_PROJECT_REF`
- [ ] Tell me "done" (no keys in the chat). The publishable key and URL go into your own `.env.local` when you run the app locally
- [ ] Before real customers: custom SMTP, CAPTCHA, `chefos-prod` on a paid plan
