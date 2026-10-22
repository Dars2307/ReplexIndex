# Replex

**Find any repository. Hand it to your agents.**

Replex searches every public GitHub repository live, surfaces what is rising right
now, scores each project for how ready it is for AI coding agents, and gives
Claude, Cursor and any MCP client a private, per-user line into your library.

- **Live discovery** — full GitHub search with language, topic, age and star filters; nothing is limited to a curated list.
- **Rising & breakout** — new repositories ranked by stars this day/week/month, plus projects under 90 days old already past 1,000 stars.
- **Agent readiness** — a transparent 0–100 score (licence, docs, install instructions, types, maintenance).
- **Stack compatibility** — evidence-based fit against your stack (e.g. Next.js + TypeScript + Tailwind).
- **Your library** — collections with notes, search history and pinned searches, synced to your account.
- **Personal MCP server** — revocable API keys; agents search on your GitHub quota and read/write only your collections.

## Stack

| Layer | Technology |
|---|---|
| Web | React 19, Vite 8, Tailwind CSS v4, Motion, Geist fonts |
| API | Express on a single Vercel function (`api/index.ts` → `server/app.ts`) |
| Data & auth | Supabase — Postgres schema `replex` with row-level security; GitHub OAuth |
| GitHub | REST search/repos API with each user's own token, Postgres-backed cache |
| Agents | Model Context Protocol, Streamable HTTP (stateless JSON) at `/api/mcp` |

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

Discovery works without any keys. Accounts need Supabase (below).

### Environment

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | browser | Supabase project URL and publishable key |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | server only | Supabase secret key (`sb_secret_…`; legacy `SUPABASE_SERVICE_ROLE_KEY` also accepted) for keys, MCP and caching |
| `TOKEN_ENCRYPTION_KEY` | server only | 32 random bytes (base64); encrypts users' GitHub tokens at rest |
| `GITHUB_TOKEN` | server only, optional | fallback token for signed-out visitors |
| `APP_URL` | server | public URL; pins CORS for account routes |

### Supabase setup

Replex lives in its own `replex` schema so it can share a project with other apps.

1. Run `supabase/migrations/20261022000000_replex_schema.sql` in the SQL editor.
2. Data API → Exposed schemas: add `replex` (keep existing entries).
3. Create a GitHub OAuth App with callback `https://<project-ref>.supabase.co/auth/v1/callback`, then enable the GitHub provider in Authentication → Sign In / Providers.
4. Authentication → URL Configuration: add your app URLs (e.g. `http://localhost:3000/**`, `https://<your-domain>/**`).
5. Optional: paste the branded templates from `supabase/templates/` into Authentication → Emails (`npm run emails` regenerates them).

## Scripts

| Command | |
|---|---|
| `npm run dev` | API + Vite dev server with reload |
| `npm test` | server, crypto, classifier and MCP protocol tests |
| `npm run typecheck` | TypeScript, no emit |
| `npm run build` | production SPA in `dist/` |
| `npm run vercel-build` | SPA + bundled API function in `.vercel/output` (Vercel Build Output API) |
| `npm start` | serve `dist/` and the API locally |

## Deploying to Vercel

Import the repository, keep the defaults from `vercel.json`, add the environment
variables above (Production + Preview), and deploy. Then add the deployment URL to
Supabase's redirect URLs and to the GitHub OAuth App's homepage URL.

## Connecting an agent

Create a key under **Agents & MCP**, then for Claude Code:

```bash
claude mcp add --transport http replex https://<your-domain>/api/mcp --header "Authorization: Bearer rpx_..."
```

See [docs/MCP.md](docs/MCP.md) for every client and tool.

## Docs

[Architecture](docs/ARCHITECTURE.md) · [API](docs/API.md) · [MCP](docs/MCP.md) · [Security](docs/SECURITY.md) · [Design](docs/DESIGN.md) · [Operations](docs/OPERATIONS.md) · [Testing](docs/TESTING.md) · [Roadmap](docs/ROADMAP.md)

## License

MIT — see [LICENSE](LICENSE).
