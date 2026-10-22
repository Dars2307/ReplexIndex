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
| `save_to_collection` | Save a repository; creates the collection if needed (needs `library:write`) |
| `recent_searches` | The user's recent searches from web and agents |

## Client setup

**Claude Code**

```bash
claude mcp add --transport http replex https://<your-domain>/api/mcp \
  --header "Authorization: Bearer rpx_..."
```

**Cursor** — `~/.cursor/mcp.json`

```json
{ "mcpServers": { "replex": { "url": "https://<your-domain>/api/mcp", "headers": { "Authorization": "Bearer rpx_..." } } } }
```

**VS Code** — `.vscode/mcp.json` (prompts for the key and stores it securely)

```json
{
  "servers": { "replex": { "type": "http", "url": "https://<your-domain>/api/mcp", "headers": { "Authorization": "Bearer ${input:replex-key}" } } },
  "inputs": [{ "type": "promptString", "id": "replex-key", "description": "Replex API key", "password": true }]
}
```

**Claude Desktop** — `claude_desktop_config.json`, via `mcp-remote`

```json
{
  "mcpServers": {
    "replex": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://<your-domain>/api/mcp", "--header", "Authorization:${REPLEX_AUTH}"],
      "env": { "REPLEX_AUTH": "Bearer rpx_..." }
    }
  }
}
```

**Raw HTTP**

```bash
curl https://<your-domain>/api/mcp -H "Authorization: Bearer rpx_..." -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"trending_repositories","arguments":{"window":"week"}}}'
```

## All supported clients

The **Agents & MCP** page has a copy-paste snippet for each client below, with
the user's new key filled in (`src/lib/mcpClients.ts`). Formats were checked
against each vendor's documentation in October 2026.

| Client | Where | Notes / source |
|---|---|---|
| Cursor | `~/.cursor/mcp.json` | `url` + `headers` — cursor.com/docs/context/mcp |
| VS Code (Copilot) | `.vscode/mcp.json` | `type: "http"`, key via `${input:…}` — code.visualstudio.com/docs/agents/reference/mcp-configuration |
| Copilot coding agent | repo Settings → Copilot → Coding agent | `tools: ["*"]`, secret `COPILOT_MCP_REPLEX_API_KEY` — docs.github.com |
| Windsurf / Devin Desktop | `~/.config/devin/mcp_config.json` | `serverUrl` (Windsurf renamed June 2026) — docs.devin.ai/desktop/cascade/mcp |
| Cline | `cline_mcp_settings.json` | must set `type: "streamableHttp"` — docs.cline.bot |
| Roo Code | `.roo/mcp.json` | `type: "streamable-http"` — Roo Code docs |
| Zed | `settings.json` → `context_servers` | `url` + `headers` — zed.dev/docs/ai/mcp |
| Continue | `.continue/mcpServers/replex.yaml` | `type: streamable-http`, `requestOptions.headers` — docs.continue.dev |
| JetBrains AI Assistant | Settings → Tools → AI Assistant → MCP | via `mcp-remote` |
| Claude Code | `claude mcp add --transport http …` | code.claude.com/docs/en/mcp |
| OpenAI Codex CLI | `codex mcp add --url … --bearer-token-env-var` | developers.openai.com/codex/mcp |
| Gemini CLI | `gemini mcp add --transport http --header …` | uses `httpUrl` in settings.json — geminicli.com |
| Antigravity CLI | `~/.gemini/config/mcp_config.json` | `serverUrl` only — antigravity.google/docs/mcp |
| Devin CLI | `~/.config/devin/mcp_config.json` | `transport: "http"` — docs.devin.ai/cli |
| OpenCode | `opencode.json` | `type: "remote"`, `{env:…}` — opencode.ai/docs/mcp-servers |
| Amp | `~/.config/amp/settings.json` | `amp.mcpServers` — ampcode.com/docs |
| Goose | `~/.config/goose/config.yaml` | `type: streamable_http` |
| Warp | Settings → Agents → MCP servers | `url` + `headers` — docs.warp.dev |
| Claude Desktop | `claude_desktop_config.json` | via `mcp-remote`; or Connectors “Request headers” beta |
| LM Studio | Program → Edit mcp.json | `url` + `headers` — lmstudio.ai/docs/app/mcp |
| ChatGPT | — | not yet: connectors only support OAuth or no auth |
