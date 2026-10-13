# End-to-end tests

Run against a **local** Supabase stack only (Docker required):

```bash
supabase start                      # uses supabase/config.toml; includes the local mail catcher
supabase status -o env              # copy API_URL and the publishable/anon key into .env.local (local demo keys)
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 npm run build
npx playwright test
```

`E2E_MAIL_URL` defaults to `http://127.0.0.1:54324`. CI runs the same steps in the `e2e` job.
