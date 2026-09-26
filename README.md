# Webhook Playground

Create a temporary webhook URL, send it an HTTP request, and inspect the
method, query, headers, raw body, parsed JSON, size, and arrival time in a live
browser workspace.

The app supports anonymous browser-bound endpoints and optional GitHub OAuth.
Signing in claims eligible anonymous endpoints from the current browser. Four
entitlement tiers control endpoint lifetime, request count, body size,
concurrent endpoints, and saved history. Plus and Pro upgrades use an explicit
mock checkout—no payment card data is accepted or stored.

## Stack

- Next.js App Router, React, and TypeScript
- Vercel hosting, cron cleanup, runtime logs, and Web Analytics
- Supabase Postgres and Auth with Row Level Security
- Vitest, Playwright, ESLint, and TypeScript checks
- OpenAPI 3.1 with Swagger UI at `/docs/api`

The locked scope is in [docs/requirements.md](docs/requirements.md), and the
security/architecture notes are in [docs/architecture.md](docs/architecture.md).

## Local setup

Prerequisites: Node.js 22 or newer, npm, and access to the dedicated Supabase
project.

```bash
npm install
cp .env.example .env.local
npm run dev
```

On PowerShell, replace the `cp` command with:

```powershell
Copy-Item .env.example .env.local
```

Required environment variables:

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe | Dedicated Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe | Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server secret | Capture and protected management operations |
| `NEXT_PUBLIC_SITE_URL` | Browser-safe | Canonical local or production URL |
| `CRON_SECRET` | Server secret | Authorizes scheduled retention cleanup |

Never expose the service-role key or cron secret to the browser and never
commit `.env.local`.

Apply [the initial migration](supabase/migrations/202609270001_initial_schema.sql)
before using the app. The exact remaining dashboard steps are listed in
[docs/manual-steps.md](docs/manual-steps.md).

## Commands

```bash
npm run dev          # local server
npm run lint         # ESLint
npm run typecheck    # strict TypeScript check
npm test             # unit, integration, and OpenAPI contract tests
npm run test:e2e     # Playwright browser tests
npm run build        # production build
```

Database RLS tests live in `supabase/tests/rls.sql` and can be run with a local
Supabase CLI environment using `supabase test db`.

## API documentation

The source contract is [openapi.yaml](openapi.yaml). Run the app and open
`http://localhost:3000/docs/api` for interactive Swagger UI. Webhook capture
accepts `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` at
`/api/hooks/{endpointSecret}`.

## Demo checkout

Only these explicit codes are accepted:

| Code | Result |
| --- | --- |
| `demo-basic` | Reset to Basic |
| `demo-plus` | Change to Plus |
| `demo-pro` | Change to Pro |
| `demo-decline` | Simulate a declined checkout |

No card-like input is accepted, sent, or stored.

## Deploy to Vercel

1. Import `techbuzzs/webhook-playground` into Vercel.
2. Add every variable from `.env.example` to Production and Preview as
   appropriate. Use the production URL for `NEXT_PUBLIC_SITE_URL`.
3. Deploy the `main` branch.
4. Add the resulting `/auth/callback` URL to Supabase Auth redirect URLs and
   set the Supabase Site URL.
5. Enable Vercel Web Analytics for the project.
6. Verify `/`, `/docs/api`, webhook capture, GitHub sign-in, and the daily
   retention cron.

The repository includes `vercel.json`, so expired history cleanup runs daily
after deployment. Vercel sends the configured `CRON_SECRET` authorization
header to the cleanup route.

## Security notes

- Anonymous ownership is bound to a random HTTP-only, SameSite browser cookie.
- Endpoint receiver tokens are high-entropy and are not management sessions.
- Sensitive headers are stored for debugging but masked by default in the UI.
- Server-side limits are snapshotted when an endpoint is created.
- The capture database function locks the endpoint row before enforcing and
  incrementing the request count, preventing concurrent limit overruns.
- Admin APIs return profile metadata only; they do not return captured bodies
  or headers.
- RLS independently prevents authenticated users from reading other users'
  endpoints, deliveries, or mock billing events.
