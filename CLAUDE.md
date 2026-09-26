# Webhook Playground

## Product scope

Build a small, Vercel-first webhook inspection app.

The first release lets a visitor create a private, high-entropy, temporary
webhook URL, receive HTTP requests at that URL, and inspect the captured
request method, URL, headers, body, timestamp, and delivery status in the
browser.

Keep the first release deliberately narrow and follow `docs/requirements.md`
as the product source of truth:

- GitHub OAuth is optional for users who want saved history. Anonymous use
  remains available, and signing in claims endpoints from the same browser.
- Use a clearly labelled mock checkout with allowlisted demo codes only. Never
  collect or store payment-card-like data.
- No email, notifications, real billing, teams, API keys, outbound forwarding,
  or permanent retention.
- Webhook URLs must use unguessable random identifiers.
- Captures expire automatically; do not promise permanent storage.
- Treat request bodies and headers as untrusted, sensitive data. Never render
  them as HTML, log secrets unnecessarily, or expose them through guessable
  URLs.

## Platform decisions

- Deploy only to Vercel. Do not add Netlify configuration or deployment docs.
- Use Supabase for persisted webhook captures and future auth/leaderboards if
  those are later approved.
- Use Vercel runtime logs for errors initially. Add a dedicated error tracker
  only after a concrete need is established.
- Add Vercel Web Analytics after the core capture flow works.
- Use a registrar plus Cloudflare for DNS when a production domain is chosen.
- Add a free external uptime monitor after the public deployment exists.
- Do not add email until account recovery or contact features are explicitly
  in scope.

## Engineering approach (Karpathy-style)

### Think before coding

- State material assumptions and tradeoffs before implementation.
- If a requirement has multiple plausible meanings, present them instead of
  choosing silently.
- Stop and ask when ambiguity changes the product, security, or data model.

### Keep it simple

- Implement the minimum code that meets the stated acceptance criteria.
- Do not add speculative features, abstractions, configuration, dependencies,
  or error paths for impossible states.
- Prefer direct, readable code. If a solution feels larger than the problem,
  simplify it.

### Make surgical changes

- Change only code needed for the request and match existing project style.
- Do not refactor adjacent code or remove pre-existing dead code without an
  explicit request.
- Remove only imports, variables, and code made unused by your own change.

### Work toward verifiable goals

- Define acceptance criteria before multi-step work.
- For defects, reproduce with a test or reliable check before fixing when
  practical, then verify the fix.
- Run the smallest relevant checks after each meaningful change and report
  what was verified.

## Token discipline

- Read only files relevant to the current task; use targeted search first.
- Keep plans, explanations, and diffs concise.
- Avoid broad repository scans, unnecessary generated output, and repeated
  checks with unchanged inputs.
- Do not add verbose documentation unless the user asks or it is essential to
  operating the app.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
