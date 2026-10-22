# Architecture

```text
Browser (React SPA)                     AI agents (Claude, Cursor, …)
   │  Supabase JS (RLS, own rows)            │  Bearer rpx_… key
   │  fetch /api/* with session JWT          │  POST /api/mcp (JSON-RPC)
   ▼                                         ▼
┌──────────────────────── Express API (one Vercel function) ───────────────────────┐
│ auth.ts     session JWT → user, or rpx_ key → sha256 lookup → user + scopes      │
│ github.ts   search / rising / breakout / repo detail · token per user · cache     │
│ mcp.ts      initialize · tools/list · tools/call (9 tools) · activity log         │
│ library.ts  collections · history · profile (always scoped to caller.userId)      │
└──────────────────────────────────────────────────────────────────────────────────┘
        │ service role                                   │ user / server token
        ▼                                                ▼
Supabase Postgres — schema "replex"                 GitHub REST API
profiles · searches · collections · collection_items · watchlists · api_keys
agent_events · user_github_tokens (encrypted) · github_cache · repos (index)
```

## Request paths

- **Per-user library data** (collections, history, profile, key list, activity) is
  read and written by the browser directly through Supabase. Row-level security
  restricts every query to the signed-in user's rows.
- **Everything that needs a secret** goes through the API: minting and revoking API
  keys, storing the user's GitHub token, GitHub calls, and MCP.
- **The service-role client bypasses RLS**, so every server query is explicitly
  scoped by `caller.userId`; user ids are never taken from request input.

## GitHub access

- GitHub has no trending API, and the OSS Insight event ranking has been
  unavailable since March 2026, so trending is computed from search:
  *rising* = created inside the window, sorted by stars; *breakout* = created in the
  last 90 days with at least 1,000 stars.
- Supabase only exposes a user's GitHub token right after OAuth. The client posts
  it once to `/api/v1/me/github-token`; the server checks it belongs to the same
  GitHub login, encrypts it (AES-256-GCM) and stores it. Searches then use the
  user's own limits (30 search requests/min, 5,000 core requests/hour), falling
  back to `GITHUB_TOKEN`.
- Responses are cached in memory per instance and in `replex.github_cache`
  (search 10 min, trending via search 10 min, repo detail 6 h), and every result is
  upserted into `replex.repos`, a full-text-indexed catalogue that grows with use.

## Classification

`src/engines/classification.ts` scores 15 categories with weighted, word-boundary
matches (GitHub topics weigh more than description words, README text least). The
readiness score (`readiness.ts`) and stack compatibility (`compatibility.ts`) are
deterministic and explainable; no LLM is involved.

## Shared Supabase project

Replex runs in the `replex` schema of a shared project ("My Repos"). It adds no
triggers to the shared `auth.users` table — the app creates its own profile row on
first sign-in (`POST /api/v1/me/bootstrap`) — and "delete my data" removes Replex
rows only, leaving the shared sign-in identity for the user's other apps.
