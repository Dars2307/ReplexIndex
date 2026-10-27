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
| `check_packages` | Call before adding dependencies: for 1–20 npm or PyPI names, the live registry and GitHub decide `ok`, `missing` (possible malware trap), `deprecated`, `archived`, `stale` (no release 2+ years, no commit 1+ year) or `dormant` (no release 3+ years), with version, last release, weekly downloads, the deprecation notice and repository status. Cached 6 hours per package |
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

## Install check (Claude Code and Cursor)

`public/hooks/replex-check.mjs` (served at `/hooks/replex-check.mjs`) is a
pre-command hook. Before the agent runs a shell command that fetches npm or
PyPI packages, it calls `POST /api/v1/packages/check`. Packages that are
`missing`, `deprecated` or `archived` are denied with a reason the agent sees;
`stale` and `dormant` ones go through with a note. Covered:

- installs: `npm i`, `pnpm add`, `yarn add`, `yarn global add`, `bun add`,
  `pip install`, `python -m pip install`, `uv add`, `uv pip install`,
  `uv tool install`, `poetry add`, `pdm add`, `pipx install`
- runners that download: `npx` (unless the project has that binary in
  `node_modules/.bin`), `npm exec`, `pnpm dlx`, `yarn dlx`, `bunx`, `uvx`,
  `uv tool run`, `pipx run`, and `npm`/`pnpm`/`yarn`/`bun create`
- bare installs (`npm install`, `pnpm i`, `yarn`, `bun install`): dependencies
  in `package.json` that the lockfile doesn't have yet, so a dependency the
  agent wrote into `package.json` is still checked
- commands wrapped in `bash -c`, `sh -c`, `cmd /c` or `powershell -Command`,
  after `cd`, and behind `sudo`, `env` or `VAR=value`

Not checked: `npm ci` (exact lockfile), `pip install -r requirements.txt`,
local paths, URLs and git specs. The hook is a guard rail for agents, not a
sandbox: a command built at run time (`npm i $(cat list)`) is not parsed.

The API key is only ever sent over HTTPS (plain `http://` is allowed for
`localhost` only). Deprecation notices and repository descriptions are written
by package authors, so they reach the agent flattened to one quoted line.

- Claude Code: `PreToolUse` hook on `Bash` in `~/.claude/settings.json`;
  denies with `hookSpecificOutput.permissionDecision: "deny"`. It never returns
  `"allow"`, so normal permission prompts are unchanged.
- Cursor: `beforeShellExecution` in `~/.cursor/hooks.json`; always prints an
  explicit `{"permission": ...}` with `agent_message` / `user_message`.
- Config: `REPLEX_API_KEY` / `REPLEX_URL`, or `~/.replex.json`
  (`{"url", "apiKey", "allow"}`). `REPLEX_ALLOW` skips private packages;
  `REPLEX_DEBUG=1` explains each decision on stderr.
- Fails open: if Replex is unreachable or no key is set, the command runs.
- Windows: reads stdin as a stream (Cursor pipes it through PowerShell), uses
  `node:http` without keep-alive (exiting with pooled sockets crashes Node on
  Windows), and strips the BOM Windows PowerShell 5.1 writes into JSON files.

Test from a terminal:

```bash
curl https://<your-domain>/api/mcp -H "Authorization: Bearer rpx_..." -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```
