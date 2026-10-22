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
