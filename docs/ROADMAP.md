# Roadmap

## Shipped in 2.0
- Live GitHub search, rising and breakout lists, repository detail and compare
- GitHub sign-in, per-user collections, history and settings (Supabase, RLS)
- Personal MCP server with revocable API keys and an activity log
- Redesign: dark/light, accessible, responsive app shell and command palette
- Branded auth emails

## Next
- **True star velocity** — snapshot stars daily (Supabase `pg_cron`) and rank
  trending by stars gained per day instead of "new and highly starred".
- **Watchlists** — notify on new releases or star milestones for saved
  repositories, topics and searches (table already exists).
- **Search the local index** — use `replex.repos` full-text search for instant
  results and as a fallback when GitHub is rate-limited.
- **OAuth for MCP** — let clients like Claude Desktop connect with OAuth instead
  of a pasted key.
- **Shareable public collections.**
