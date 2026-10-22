# Security model

## Identity
- Sign-in is GitHub OAuth through Supabase Auth (PKCE). The API accepts either a
  Supabase session JWT (verified with `auth.getUser`) or a personal API key.
- API keys are `rpx_` + 32 random bytes. Only a SHA-256 hash is stored; the raw
  key is shown once. Keys carry scopes (each MCP tool requires one), are limited
  to 10 active per user, and every request made with a key is metered by an
  atomic per-minute counter (`replex.hit_api_key`, 60/min; fails closed).
  Revocation is final: only the server can set `revoked_at` and nothing can
  clear it. Key management requires a browser session — a key can't mint or
  revoke keys.
- Signed-out discovery requests are throttled per IP (40/min per instance). In
  production, add a Vercel Firewall rate-limit rule on `/api/v1/*` as well.

## Authorization
- Every table in the `replex` schema has row-level security enabled.
- Browser roles get the narrowest grants: `api_keys` exposes only non-secret
  columns (never `key_hash`) and only `revoked_at` is updatable; profiles allow
  updates to four preference columns; `user_github_tokens` and `github_cache` have
  no client grants at all.
- The server's service-role client bypasses RLS, so every server query filters by
  the authenticated `caller.userId`. User ids are never read from request input.

## Secrets
- Users' GitHub tokens are encrypted with AES-256-GCM (random 96-bit IV, auth
  tag) under `TOKEN_ENCRYPTION_KEY`, and only stored after confirming the token's
  numeric GitHub user id matches the GitHub identity linked by Supabase Auth
  (not user-editable metadata).
- Only public repositories are ever returned, cached or indexed: searches add
  `is:public`, and results/details are filtered on `private`/`visibility`
  regardless of the scopes a token carries.
- No secret is exposed to the browser except the Supabase publishable key, which
  is designed to be public and is constrained by RLS.

## Input handling
- GitHub qualifiers (`language`, `topic`) must match a strict allow-list pattern,
  so user input can't inject additional search qualifiers; free text is
  newline-stripped and capped at 200 characters.
- Repository names are validated as `owner/repo` (no `.`/`..` segments) and
  URL-encoded before any GitHub request.
- MCP tools return only expected error messages to agents; unexpected errors
  are logged server-side and reported generically.
- JSON bodies are limited to 64 KB; malformed bodies return 400, oversized 413.
- README content is rendered as plain React text nodes — never as HTML.

## HTTP
- Bearer-token auth only (no cookies), so CORS can't be used for CSRF; account
  routes are additionally pinned to `APP_URL`.
- Production responses carry a Content-Security-Policy (the inline theme script
  is allowed by its SHA-256 hash, computed at build time), plus
  `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`,
  `Permissions-Policy` and HSTS.
- Responses fetched with a signed-in user's token are `private, no-store`.

## Reporting
Please report vulnerabilities privately to the repository owner rather than in a
public issue.
