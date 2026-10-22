# Testing

```bash
npm test          # node:test suite (server/server.test.ts)
npm run typecheck # TypeScript across src/, server/, api/
npm run build     # production build
```

The suite covers:
- **Crypto** — API key format, hash-only storage, AES-GCM round-trip and tamper
  detection, constant-time comparison.
- **GitHub query builder** — qualifier injection, newline stripping, length caps,
  `owner/repo` validation.
- **Classifier** — security/reverse-engineering, AI, design; word-boundary
  matching (no false positives from substrings).
- **MCP protocol** — version negotiation, tool listing, JSON-RPC errors, tool
  failures as `isError`, scope enforcement.
- **HTTP** — health without secrets, 401 + `WWW-Authenticate` on MCP, 405 on GET,
  anonymous account routes rejected, 413 for oversized bodies, JSON 404s.

Visual checks were done in the browser at desktop (1440px) and phone (375px)
widths in both themes, including keyboard navigation of the sidebar, command
palette and dialogs.

Not automated yet: the signed-in flows against a live Supabase project (sign-in,
collections, key creation, MCP with a real key) — verify these manually after
configuring GitHub OAuth.
