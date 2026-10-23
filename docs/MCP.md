# MCP server

Endpoint: `POST https://<your-domain>/api/mcp` · Transport: Streamable HTTP,
stateless JSON responses (no SSE, no session id) · Auth:
`Authorization: Bearer rpx_…` (create keys under **Agents & MCP**).

Supported protocol versions: `2025-11-25`, `2025-06-18`, `2025-03-26`,
`2024-11-05`. Methods: `initialize`, `ping`, `tools/list`, `tools/call`;
notifications receive `202 Accepted`.

Every tool runs **as the key's owner**: GitHub calls use that user's token and
quota, and library tools only see that user's collections and history. Each call
is logged to the user's **Recent agent activity**.

**Agent access is read-only.** Keys are created with read scopes only
(`search:read`, `repositories:read`, `library:read`, `mcp:invoke`), any write
scope stored on an older key is ignored, and no tool changes the user's library
or any repository. Each key is named after its agent, shown once, stored only as
a SHA-256 hash, and revocable.

## Tools

| Tool | Purpose |
|---|---|
| `search_repositories` | Live search across all public GitHub repositories (`query`, `language`, `topic`, `sort`, `created_within_days`, `min_stars`, `limit`) |
| `trending_repositories` | Rising (window `day`/`week`/`month`) and breakout repositories |
| `get_repository` | Full intelligence for one repository, including readiness and latest release |
| `compare_repositories` | 2–4 repositories side by side, scored against a stack |
| `check_compatibility` | Evidence for/against fitting a target stack |
| `review_repository` | Gemini review grounded in GitHub evidence (CI, commits, bugs, issues, README): verdict, health, known issues, stack fit, setup steps and a Markdown `agentBrief`. Uses the 25/day AI allowance unless cached |
| `list_collections` | The user's collections with counts |
| `get_collection` | Repositories in one collection (by name or id) |
| `recent_searches` | The user's recent searches from web and agents |

## Agents

The **Agents & MCP** page shows setup for each agent below, with the user's new
key filled in (`src/lib/mcpClients.ts`). Formats were checked against each
vendor's documentation in October 2026.

| Agent | Setup | Source |
|---|---|---|
| Claude Code | `claude mcp add --transport http replex <url> --header "Authorization: Bearer rpx_…"` | code.claude.com/docs/en/mcp |
| Claude Desktop | `claude_desktop_config.json` via `mcp-remote` (or Connectors "Request headers" beta) | Claude docs |
| ChatGPT / Codex | `codex mcp add replex --url <url> --bearer-token-env-var REPLEX_API_KEY`. The ChatGPT app is **not supported**: its custom connectors accept only OAuth or no auth, not an API key | developers.openai.com/codex/mcp |
| Gemini CLI | `gemini mcp add --transport http --header "Authorization: …" replex <url>` | geminicli.com |
| Cursor | `~/.cursor/mcp.json`: `url` + `headers` | cursor.com/docs/context/mcp |
| Windsurf (Devin Desktop) | `~/.config/devin/mcp_config.json`: `serverUrl` + `headers` | docs.devin.ai/desktop/cascade/mcp |
| Devin | Settings → Customize → MCPs → Add custom MCP → HTTP, URL, `Authorization` header (needs Manage MCP Servers). Devin CLI: `mcp_config.json` with `transport: "http"` | docs.devin.ai/work-with-devin/mcp |
| Replit Agent | replit.com/integrations → MCP Servers → + Add MCP server → URL → Advanced settings → `Authorization` header → Test & save | docs.replit.com/features/mcp/overview |
| Custom agent | Any MCP client: `{ "mcpServers": { "replex": { "url": "<url>", "headers": { "Authorization": "Bearer rpx_…" } } } }`. Your own server sends the same header; keep the key server-side | — |

Test from a terminal:

```bash
curl https://<your-domain>/api/mcp -H "Authorization: Bearer rpx_..." -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```
