# Webhook Playground requirements

Status: locked on 2026-09-27.

## Product goal

Webhook Playground is a Vercel-hosted developer tool for creating private,
temporary webhook endpoints and inspecting delivered HTTP requests. Visitors
can use it anonymously; signed-in users can claim anonymous endpoints and
retain/manage their history.

## Hosting and services

- Hosting: Vercel only.
- Database and authentication: the dedicated Supabase project
  `webhook-playground` (`zncesweeniumqzrxngrp`), separate from Retro Arcade.
- Analytics: Vercel Web Analytics only.
- Error investigation: Vercel runtime logs initially.
- Uptime monitoring: UptimeRobot after the production Vercel URL exists.
- Domain and DNS: deferred until a production domain is chosen; use a registrar
  and Cloudflare then.
- Email, a payment processor, and a dedicated error tracker: out of scope.

## Webhook behavior

- A visitor can immediately create a webhook endpoint with a cryptographically
  random, unguessable secret URL.
- The receiver records method, path, query parameters, headers, raw body,
  parsed JSON when applicable, content type, body size, and received time.
- The receiver accepts normal requests, caps body size before storage, and
  returns a small documented success response.
- Expired or invalid endpoint URLs return `404`.
- Requests appear in the browser through short polling (approximately every
  three seconds).
- The application never renders received content as HTML.
- Common sensitive headers are stored but hidden until the endpoint viewer
  explicitly reveals them.
- The user interface warns that webhook content may contain secrets.
- No forwarding, replay, transformation, retries, configurable responses,
  notifications, billing, teams, or API keys in v1.

## Anonymous and signed-in use

- GitHub OAuth is the only sign-in method in v1.
- Anonymous use is permitted.
- Anonymous endpoint ownership is browser-bound until the visitor signs in.
- A signed-in visitor may claim eligible anonymous endpoints created in their
  current browser; the claim transfers them into the account history.
- A signed-in user can list, rename, delete, and inspect their own endpoints
  and deliveries, view usage, and delete their account/application data.
- Supabase Row Level Security must prevent cross-user endpoint and delivery
  access.

## Access levels and limits

There are four entitlement tiers and one separate administrative role.

| Entitlement or role | Public | Multiplier |
| --- | --- | ---: |
| Basic | Yes | 1x |
| Plus | Yes | 2x |
| Pro | Yes | 4x |
| Super User | No | 8x |
| Admin role | No | N/A |

Basic limits are the baseline. Plus doubles Basic, Pro doubles Plus, and
Super User doubles Pro. Server-side safety ceilings apply to every account.

| Allowance | Basic | Plus | Pro | Super User |
| --- | ---: | ---: | ---: | ---: |
| Endpoint lifetime | 24 hours | 48 hours | 96 hours | 192 hours |
| Deliveries per endpoint | 100 | 200 | 400 | 800 |
| Captured body size | 256 KB | 512 KB | 1 MB | 2 MB |
| Concurrent endpoints | 3 | 6 | 12 | 24 |
| Saved history | 7 days | 14 days | 28 days | 56 days |

Super User is a private internal/support entitlement and does not appear in
pricing. Admin is an administrative role, not a purchasable plan.

## Mock paywall

- Public pricing shows Basic, Plus, and Pro only.
- Checkout is visibly labelled as a demo; no real payment is processed.
- Checkout accepts a small, server-side allowlist of explicit demo codes such
  as `demo-plus`, `demo-pro`, and `demo-decline`.
- The browser does not submit payment-card-like data and the application does
  not store payment data.
- The server records a mock billing event and applies the entitlement.
- Users can reverse a demo upgrade from account settings.

## Administration

- Admins may find users by ID, email, or GitHub identity and adjust
  entitlement/role, subject to audit logging.
- Admins can disable accounts.
- Admins cannot view other users' captured webhook bodies or headers.
- Emergency support access to payloads is out of scope.

## API documentation

- Maintain an OpenAPI 3.1 definition in `openapi.yaml`.
- Provide Swagger UI at `/docs/api`.
- Document the public receiver, authenticated account API, and Admin API.
- Validate API behavior against the OpenAPI contract in tests.

Initial endpoint groups:

- `POST|PUT|PATCH|DELETE /api/hooks/{endpointSecret}` for inbound capture.
- `/api/endpoints` and endpoint/delivery detail routes for user management.
- `/api/account/usage` for entitlement and usage.
- `/api/mock-checkout` for demo-code upgrades.
- `/api/admin/users` for Admin-only user administration.

## Quality and documentation

- Unit tests cover limits, authorization, mock billing, expiry, and header
  redaction.
- Integration tests cover capture, ownership, limits, expiry, and role access.
- Database tests prove RLS prevents cross-user reads.
- End-to-end tests cover anonymous capture, endpoint claiming, account history,
  mock upgrades, and Admin access control.
- Validate the OpenAPI document and contract.
- Require lint, type-check, build, and test commands in CI.
- The repository README must document local setup, environment variables,
  Supabase migration, testing, OpenAPI/Swagger, demo payment codes, and Vercel
  deployment.
