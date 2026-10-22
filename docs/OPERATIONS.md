# Operations

## Environments
| | URL | Supabase | Notes |
|---|---|---|---|
| Local | http://localhost:3000 | shared "My Repos" project, schema `replex` | `npm run dev` |
| Production | Vercel | same project | env vars set in Vercel |

## Deploy (Vercel)
`vercel.json` runs `npm run vercel-build`, which writes `.vercel/output`
(Build Output API v3): static SPA, one Node 22 function for `/api/*`, cache and
security headers, SPA fallback. No framework preset is needed.

After the first deploy:
1. Add `https://<domain>/**` to Supabase → Authentication → URL Configuration.
2. Set the GitHub OAuth App homepage to the domain.
3. Set `APP_URL` to the domain.

## Database changes
Migrations live in `supabase/migrations/`. Apply them in the Supabase SQL editor
(or `supabase db push`). Replex only ever touches the `replex` schema.

## Monitoring
- `GET /api/health` — configuration flags and the last observed GitHub rate limit.
- Server errors are logged with the `[replex]` prefix (Vercel function logs).
- Per-user agent activity is visible in the app under **Agents & MCP**.

## Cache housekeeping
The server calls `replex.purge_expired()` on roughly 2% of cache writes, which
deletes cache rows expired for over an hour and old API-key usage windows. To
run it on a schedule as well (Supabase → Integrations → Cron):

```sql
select cron.schedule('replex-purge', '15 * * * *', $$select replex.purge_expired()$$);
```

## Rate limiting
- API keys: 60 requests/minute, metered atomically in Postgres.
- Signed-out visitors: 40 requests/minute per IP per function instance. Add a
  Vercel Firewall rule (e.g. 60 requests/minute per IP on `/api/v1/*`) for a
  global limit.
