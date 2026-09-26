# Architecture and security

## Request flow

1. `POST /api/endpoints` creates a high-entropy receiver token and binds the
   endpoint to either the authenticated user or a hashed anonymous-session
   cookie.
2. An external service sends a request to `/api/hooks/{endpointSecret}`.
3. The server caps the body before persistence and calls the
   `capture_delivery` database function.
4. The database locks the endpoint row, verifies expiry, body size, and request
   count, inserts the delivery, and increments the count atomically.
5. The workspace polls the protected delivery route every three seconds.

## Trust boundaries

- Webhook payloads, headers, names, OAuth metadata, and query strings are
  untrusted input.
- Captured bodies are rendered only as React text, never injected HTML.
- Browser-safe Supabase values may be public; the service-role key and cron
  secret are server-only.
- Anonymous session tokens are HTTP-only. Only their SHA-256 hashes are stored.
- Receiver tokens are capabilities: anyone possessing one can deliver data,
  but cannot read or manage the endpoint.
- Admins manage profiles and entitlements through server routes. Those routes
  never query deliveries.

## Retention and deletion

Endpoints stop accepting deliveries at `expires_at`. A Vercel cron calls a
server-only cleanup route daily; the database deletes endpoints after
`history_expires_at`, cascading to deliveries. Users may delete endpoints or
their entire account sooner.

## Authorization

Management routes verify the Supabase user or anonymous-session hash before
using the service client. RLS is defense in depth for direct authenticated
database reads: profiles, endpoints, deliveries, and billing events are
limited to `auth.uid()` ownership. No browser role can execute the capture or
cleanup database functions.
