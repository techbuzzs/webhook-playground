# Manual setup remaining

These steps require account-owner access and cannot be completed from the
repository alone.

## 1. Apply the Supabase migration

In the `webhook-playground` Supabase project (`zncesweeniumqzrxngrp`), open the
SQL editor and run:

`supabase/migrations/202609270001_initial_schema.sql`

Alternatively, authenticate the Supabase CLI, link this repository to project
`zncesweeniumqzrxngrp`, and run `supabase db push`.

Obtain the project's secret service-role key from Supabase project settings.
Never paste that key into GitHub issues, documentation, or a `NEXT_PUBLIC_*`
variable.

## 2. Configure GitHub OAuth

Create a GitHub OAuth App for Webhook Playground:

- Homepage URL: the production Vercel URL (use `http://localhost:3000` during
  local setup).
- Authorization callback URL:
  `https://zncesweeniumqzrxngrp.supabase.co/auth/v1/callback`

In Supabase Authentication → Providers → GitHub, enable GitHub and enter the
OAuth App client ID and client secret.

In Supabase Authentication → URL Configuration:

- Set Site URL to the production Vercel URL.
- Add `http://localhost:3000/auth/callback` for local development.
- Add `https://YOUR-VERCEL-DOMAIN/auth/callback` for production.

## 3. Connect the existing Vercel project to GitHub

`https://webhook-playground.vercel.app` currently serves an older application,
not this repository. In Vercel, open the existing **webhook-playground**
project, then go to **Settings → Git** and connect:

- Repository: `techbuzzs/webhook-playground`
- Production Branch: `main`
- Root Directory: `.`
- Framework Preset: Next.js

Save the connection, then choose **Deployments → Redeploy** (or push a new
commit) to replace the old deployment with the `main` branch build. If the
existing Vercel project is not yours or cannot be reconnected, create a new
project by importing that same repository; Vercel will assign a different URL
until the existing `webhook-playground.vercel.app` project is removed or
renamed.

## 4. Configure Vercel environment variables

In Vercel, open **webhook-playground → Settings → Environment Variables**.
Add these values for **Production** and **Preview** before deploying:

- `NEXT_PUBLIC_SUPABASE_URL=https://zncesweeniumqzrxngrp.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` using the provided publishable key
- `SUPABASE_SERVICE_ROLE_KEY` from Supabase project settings
- `NEXT_PUBLIC_SITE_URL=https://YOUR-VERCEL-DOMAIN`
- `CRON_SECRET` as a newly generated high-entropy random value

Apply server secrets to Production and Preview only where needed. Redeploy
after changing environment variables.

## 5. Create the first Admin

Sign in once with GitHub, then use the Supabase SQL editor to promote only your
account:

```sql
update public.profiles
set role = 'admin'
where email = 'YOUR_GITHUB_EMAIL';
```

Confirm that exactly one intended row was changed.

## 6. Enable analytics and verify deployment

Enable Web Analytics in the Vercel project dashboard. Then verify:

- Anonymous endpoint creation and capture
- Sensitive-header masking and reveal
- GitHub sign-in and anonymous endpoint claiming
- `demo-plus`, `demo-pro`, `demo-basic`, and `demo-decline`
- Admin access and the inability to view other users' payloads
- `/docs/api`
- The retention cron invocation

## 7. Add uptime monitoring after the Vercel URL exists

Create the planned UptimeRobot HTTP monitor for the production root URL. Use a
five-minute interval on the free plan and enable the notification channel you
actually monitor.
