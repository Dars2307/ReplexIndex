# REST API

Base path: `/api`. Authentication is a bearer token — either a Supabase session
JWT (web app) or a personal API key `rpx_…`. Errors are JSON:
`{ "error": "message", "code": "machine_code" }`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Service status and configuration flags (no secrets) |
| GET | `/api/v1/discover/search` | optional | Live GitHub search. Query: `q`, `language`, `topic`, `sort` (`stars`/`updated`/`forks`), `created` (days), `pushed` (days), `minStars`, `page` (≤10), `perPage` (≤50). Signed-in searches are added to history. |
| GET | `/api/v1/discover/trending` | optional | `{ rising, breakout }`. Query: `window` (`day`/`week`/`month`), `language`, `topic` |
| GET | `/api/v1/repos/:owner/:repo` | optional | Repository with purpose, readiness, latest release, README extract; `compatibility` for `?stack=` or the profile stack |
| POST | `/api/v1/compare` | optional | Body `{ fullNames: string[2..4], targetStack? }` |
| GET | `/api/v1/ai/status` | optional | `{ enabled, signedIn, limit, remaining }` for AI search |
| POST | `/api/v1/ai/search` | required | Body `{ prompt }` (≤400 chars). Gemini plans 2–3 GitHub searches and suggests well-known repos (each confirmed to exist on GitHub), then checks every candidate against the request. Returns `{ interpretation, queries, results: [{ repository, verdict: "match"\|"partial"\|null, score, why }], considered, confirmedSuggestions, verified, remaining }`. 25 AI requests (searches + reviews) per user per day; `verified: false` means the AI check was unavailable and results are unranked |
| GET | `/api/v1/repos/:owner/:repo/review` | required | `{ enabled, review \| null, remaining, limit }`: a stored AI review for this commit and stack (`?stack=`, default profile stack), without using the allowance |
| POST | `/api/v1/repos/:owner/:repo/review` | required | Body `{ targetStack? }`. Gemini review grounded in GitHub evidence (CI check runs on the latest commit, last commit, open `bug` issues, most-discussed issues, README): `verdict` (`solid`/`usable`/`caution`/`avoid`), `summary`, `health`, `knownIssues`, `stackFit`, `setup`, `agentBrief` (Markdown) and the raw `evidence`. Cached 24 h per commit and stack; shares the 25/day AI allowance |
| POST | `/api/v1/me/bootstrap` | session | Create the caller's Replex profile on first sign-in |
| POST | `/api/v1/me/github-token` | session | Body `{ providerToken }`; verified against the user's GitHub login, stored encrypted |
| POST | `/api/v1/me/keys` | session | Body `{ name }` → `{ key, record }`. The raw key is returned once; max 10 active |
| DELETE | `/api/v1/me/keys/:id` | session | Revoke a key |
| DELETE | `/api/v1/me/data` | session | Delete all Replex data for the caller |
| GET | `/api/v1/mcp/tools` | — | Public list of MCP tools |
| POST | `/api/mcp`, `/api/v1/mcp` | API key | MCP Streamable HTTP endpoint — see [MCP.md](MCP.md) |

## Limits

- Request bodies: 64 KB.
- API keys: 60 calls per minute per key (HTTP 429 beyond).
- GitHub: results are capped at 1,000 per query by GitHub; rate-limit errors come
  back as HTTP 429 with the reset time.
