// Setup instructions for MCP clients connecting to Replex over Streamable
// HTTP with a bearer key. Formats verified against each vendor's docs
// (October 2026); see docs/MCP.md for sources.

export type ClientGroup = 'Editors & IDEs' | 'Terminal agents' | 'Desktop & chat apps' | 'Other';

export interface McpClient {
  id: string;
  name: string;
  group: ClientGroup;
  /** Where the snippet goes, shown above it. */
  where: string;
  language: 'bash' | 'json' | 'toml' | 'yaml' | 'text';
  snippet: (url: string, key: string) => string;
  note?: string;
  /** Client can't use a static key yet. */
  unsupported?: boolean;
}

const json = (value: unknown) => JSON.stringify(value, null, 2);
const bearer = (key: string) => `Bearer ${key}`;

// stdio bridge for clients that can't send custom headers natively.
const mcpRemote = (url: string, key: string) => ({
  command: 'npx',
  args: ['-y', 'mcp-remote', url, '--header', 'Authorization:${AUTH_HEADER}'],
  env: { AUTH_HEADER: bearer(key) },
});

export const MCP_CLIENTS: McpClient[] = [
  // Editors & IDEs -----------------------------------------------------------
  {
    id: 'cursor',
    name: 'Cursor',
    group: 'Editors & IDEs',
    where: '~/.cursor/mcp.json (global) or .cursor/mcp.json (project)',
    language: 'json',
    snippet: (url, key) => json({ mcpServers: { replex: { url, headers: { Authorization: bearer(key) } } } }),
  },
  {
    id: 'vscode',
    name: 'VS Code (Copilot)',
    group: 'Editors & IDEs',
    where: '.vscode/mcp.json — VS Code prompts for the key and stores it securely',
    language: 'json',
    snippet: (url) =>
      json({
        inputs: [{ type: 'promptString', id: 'replex-key', description: 'Replex API key', password: true }],
        servers: { replex: { type: 'http', url, headers: { Authorization: 'Bearer ${input:replex-key}' } } },
      }),
  },
  {
    id: 'windsurf',
    name: 'Windsurf / Devin Desktop',
    group: 'Editors & IDEs',
    where: 'macOS/Linux: ~/.config/devin/mcp_config.json · Windows: %APPDATA%\\devin\\mcp_config.json',
    language: 'json',
    snippet: (url, key) => json({ mcpServers: { replex: { serverUrl: url, headers: { Authorization: bearer(key) } } } }),
    note: 'Windsurf was renamed Devin Desktop in June 2026.',
  },
  {
    id: 'cline',
    name: 'Cline',
    group: 'Editors & IDEs',
    where: 'Cline → MCP Servers → Configure MCP Servers (cline_mcp_settings.json)',
    language: 'json',
    snippet: (url, key) =>
      json({ mcpServers: { replex: { type: 'streamableHttp', url, headers: { Authorization: bearer(key) }, disabled: false, autoApprove: [] } } }),
    note: 'Keep "type": "streamableHttp" — without it Cline falls back to legacy SSE and fails to connect.',
  },
  {
    id: 'roo',
    name: 'Roo Code',
    group: 'Editors & IDEs',
    where: 'Global: Edit Global MCP (mcp_settings.json) · Project: .roo/mcp.json',
    language: 'json',
    snippet: (url, key) => json({ mcpServers: { replex: { type: 'streamable-http', url, headers: { Authorization: bearer(key) } } } }),
  },
  {
    id: 'zed',
    name: 'Zed',
    group: 'Editors & IDEs',
    where: 'Zed settings.json (or Settings → AI → MCP Servers → Add Remote Server)',
    language: 'json',
    snippet: (url, key) => json({ context_servers: { replex: { url, headers: { Authorization: bearer(key) } } } }),
  },
  {
    id: 'continue',
    name: 'Continue',
    group: 'Editors & IDEs',
    where: '.continue/mcpServers/replex.yaml',
    language: 'yaml',
    snippet: (url, key) =>
      `name: Replex\nversion: 0.0.1\nschema: v1\nmcpServers:\n  - name: replex\n    type: streamable-http\n    url: ${url}\n    requestOptions:\n      headers:\n        Authorization: ${bearer(key)}`,
  },
  {
    id: 'jetbrains',
    name: 'JetBrains AI Assistant',
    group: 'Editors & IDEs',
    where: 'Settings → Tools → AI Assistant → Model Context Protocol (MCP) → Add → As JSON',
    language: 'json',
    snippet: (url, key) => json({ mcpServers: { replex: mcpRemote(url, key) } }),
    note: 'Uses the mcp-remote bridge (needs Node.js), the format JetBrains documents for servers that need headers.',
  },
  {
    id: 'copilot-agent',
    name: 'Copilot coding agent',
    group: 'Editors & IDEs',
    where: 'Repository → Settings → Copilot → Coding agent → MCP configuration. Add a secret named COPILOT_MCP_REPLEX_API_KEY.',
    language: 'json',
    snippet: (url) =>
      json({ mcpServers: { replex: { type: 'http', url, tools: ['*'], headers: { Authorization: 'Bearer $COPILOT_MCP_REPLEX_API_KEY' } } } }),
  },

  // Terminal agents ------------------------------------------------------------
  {
    id: 'claude-code',
    name: 'Claude Code',
    group: 'Terminal agents',
    where: 'Run in your terminal (add --scope user to use it in every project)',
    language: 'bash',
    snippet: (url, key) => `claude mcp add --transport http replex ${url} \\\n  --header "Authorization: ${bearer(key)}"`,
  },
  {
    id: 'codex',
    name: 'OpenAI Codex CLI',
    group: 'Terminal agents',
    where: 'Run in your terminal — Codex reads the key from an environment variable',
    language: 'bash',
    snippet: (url, key) => `export REPLEX_API_KEY=${key}\ncodex mcp add replex --url ${url} --bearer-token-env-var REPLEX_API_KEY`,
    note: 'Or in ~/.codex/config.toml: [mcp_servers.replex] url = "…", bearer_token_env_var = "REPLEX_API_KEY".',
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    group: 'Terminal agents',
    where: 'Run in your terminal (or add to ~/.gemini/settings.json with "httpUrl")',
    language: 'bash',
    snippet: (url, key) => `gemini mcp add --transport http --header "Authorization: ${bearer(key)}" replex ${url}`,
  },
  {
    id: 'antigravity',
    name: 'Antigravity CLI',
    group: 'Terminal agents',
    where: '~/.gemini/config/mcp_config.json (global) or .agents/mcp_config.json (workspace)',
    language: 'json',
    snippet: (url, key) => json({ mcpServers: { replex: { serverUrl: url, headers: { Authorization: bearer(key) } } } }),
    note: 'Antigravity CLI succeeds Gemini CLI and only accepts "serverUrl".',
  },
  {
    id: 'devin-cli',
    name: 'Devin CLI',
    group: 'Terminal agents',
    where: '~/.config/devin/mcp_config.json (Windows: %APPDATA%\\devin\\) or .devin/mcp_config.json',
    language: 'json',
    snippet: (url, key) => json({ mcpServers: { replex: { url, transport: 'http', headers: { Authorization: bearer(key) } } } }),
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    group: 'Terminal agents',
    where: 'opencode.json — set REPLEX_API_KEY in your environment',
    language: 'json',
    snippet: (url) => json({ mcp: { replex: { type: 'remote', url, enabled: true, headers: { Authorization: 'Bearer {env:REPLEX_API_KEY}' } } } }),
  },
  {
    id: 'amp',
    name: 'Amp',
    group: 'Terminal agents',
    where: '~/.config/amp/settings.json or .amp/settings.json — set REPLEX_API_KEY in your environment',
    language: 'json',
    snippet: (url) => json({ 'amp.mcpServers': { replex: { url, headers: { Authorization: 'Bearer ${REPLEX_API_KEY}' } } } }),
  },
  {
    id: 'goose',
    name: 'Goose',
    group: 'Terminal agents',
    where: '~/.config/goose/config.yaml',
    language: 'yaml',
    snippet: (url, key) =>
      `extensions:\n  replex:\n    name: replex\n    type: streamable_http\n    uri: ${url}\n    headers:\n      Authorization: ${bearer(key)}\n    enabled: true\n    timeout: 300`,
  },
  {
    id: 'warp',
    name: 'Warp',
    group: 'Terminal agents',
    where: 'Warp → Settings → Agents → MCP servers → + Add',
    language: 'json',
    snippet: (url, key) => json({ mcpServers: { replex: { url, headers: { Authorization: bearer(key) } } } }),
  },

  // Desktop & chat apps ---------------------------------------------------------
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    group: 'Desktop & chat apps',
    where: 'Settings → Developer → Edit config (claude_desktop_config.json)',
    language: 'json',
    snippet: (url, key) => json({ mcpServers: { replex: mcpRemote(url, key) } }),
    note: 'Uses the mcp-remote bridge (needs Node.js). If your org has Claude’s connector “Request headers” beta, you can instead add Replex under Customize → Connectors with the header authorization: Bearer <key>.',
  },
  {
    id: 'lm-studio',
    name: 'LM Studio',
    group: 'Desktop & chat apps',
    where: 'LM Studio → Program tab → Install → Edit mcp.json',
    language: 'json',
    snippet: (url, key) => json({ mcpServers: { replex: { url, headers: { Authorization: bearer(key) } } } }),
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    group: 'Desktop & chat apps',
    where: 'Not available yet',
    language: 'text',
    snippet: () => 'ChatGPT connectors only support OAuth or no authentication, so they can’t use a Replex API key yet.\nOAuth sign-in for MCP is on the Replex roadmap.',
    unsupported: true,
  },

  // Other ---------------------------------------------------------------------------
  {
    id: 'http',
    name: 'HTTP / cURL',
    group: 'Other',
    where: 'Test from any terminal',
    language: 'bash',
    snippet: (url, key) =>
      `curl ${url} \\\n  -H "Authorization: ${bearer(key)}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"trending_repositories","arguments":{"window":"week"}}}'`,
  },
];

export const CLIENT_GROUPS: ClientGroup[] = ['Editors & IDEs', 'Terminal agents', 'Desktop & chat apps', 'Other'];
