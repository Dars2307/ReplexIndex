// Setup instructions for agents connecting to Replex over Streamable HTTP with
// a bearer key. Formats verified against each vendor's docs (October 2026);
// see docs/MCP.md for sources.

export interface McpClient {
  id: string;
  name: string;
  /** Suggested name for a new key. */
  keyName: string;
  /** Where the setup goes, shown above it. */
  where: string;
  /** Click-through setup in the agent's own settings, when it has no config file. */
  steps?: (url: string, key: string) => string[];
  snippet: (url: string, key: string) => string;
  /** Second block, e.g. a test command. */
  extra?: { label: string; code: (url: string, key: string) => string };
  note?: string;
}

const json = (value: unknown) => JSON.stringify(value, null, 2);
const bearer = (key: string) => `Bearer ${key}`;

// stdio bridge for clients that can't send custom headers natively.
const mcpRemote = (url: string, key: string) => ({
  command: 'npx',
  args: ['-y', 'mcp-remote', url, '--header', 'Authorization:${AUTH_HEADER}'],
  env: { AUTH_HEADER: bearer(key) },
});

const curlTest = (url: string, key: string) =>
  `curl ${url} \\\n  -H "Authorization: ${bearer(key)}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

export const MCP_CLIENTS: McpClient[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    keyName: 'Claude Code',
    where: 'Run in your terminal (add --scope user to use it in every project)',
    snippet: (url, key) => `claude mcp add --transport http replex ${url} \\\n  --header "Authorization: ${bearer(key)}"`,
  },
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    keyName: 'Claude Desktop',
    where: 'Settings → Developer → Edit config (claude_desktop_config.json)',
    snippet: (url, key) => json({ mcpServers: { replex: mcpRemote(url, key) } }),
    note: 'Uses the mcp-remote bridge (needs Node.js). If your org has Claude’s connector “Request headers” beta, you can instead add Replex under Customize → Connectors with the header authorization: Bearer <key>.',
  },
  {
    id: 'codex',
    name: 'ChatGPT / Codex',
    keyName: 'Codex',
    where: 'Run in your terminal — Codex reads the key from an environment variable',
    snippet: (url, key) => `export REPLEX_API_KEY=${key}\ncodex mcp add replex --url ${url} --bearer-token-env-var REPLEX_API_KEY`,
    note: 'The ChatGPT app itself can’t connect yet: its custom connectors only accept an OAuth sign-in, not an API key. Codex works today. To configure it by file instead, use ~/.codex/config.toml: [mcp_servers.replex] url = "…", bearer_token_env_var = "REPLEX_API_KEY".',
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    keyName: 'Gemini CLI',
    where: 'Run in your terminal (or add to ~/.gemini/settings.json with "httpUrl")',
    snippet: (url, key) => `gemini mcp add --transport http --header "Authorization: ${bearer(key)}" replex ${url}`,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    keyName: 'Cursor',
    where: '~/.cursor/mcp.json (global) or .cursor/mcp.json (project)',
    snippet: (url, key) => json({ mcpServers: { replex: { url, headers: { Authorization: bearer(key) } } } }),
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    keyName: 'Windsurf',
    where: 'macOS/Linux: ~/.config/devin/mcp_config.json · Windows: %APPDATA%\\devin\\mcp_config.json',
    snippet: (url, key) => json({ mcpServers: { replex: { serverUrl: url, headers: { Authorization: bearer(key) } } } }),
    note: 'Windsurf (by Cognition) was renamed Devin Desktop in June 2026; the same file works for both.',
  },
  {
    id: 'devin',
    name: 'Devin',
    keyName: 'Devin',
    where: 'Devin web app, by Cognition (adding servers needs the Manage MCP Servers permission)',
    steps: (url, key) => [
      'Open Settings → Customize → MCPs and click Add custom MCP.',
      'Choose the HTTP (Streamable HTTP) transport.',
      `Server URL: ${url}`,
      `Add a header named Authorization with the value ${bearer(key)}.`,
      'Save, then ask Devin to list the Replex tools.',
    ],
    snippet: (url, key) => json({ mcpServers: { replex: { url, transport: 'http', headers: { Authorization: bearer(key) } } } }),
    note: 'The JSON above is for the Devin CLI: ~/.config/devin/mcp_config.json (Windows: %APPDATA%\\devin\\) or .devin/mcp_config.json in a project.',
  },
  {
    id: 'replit',
    name: 'Replit Agent',
    keyName: 'Replit Agent',
    where: 'Replit workspace → Integrations → MCP Servers',
    steps: (url, key) => [
      'Go to replit.com/integrations and open MCP Servers.',
      'Click + Add MCP server and paste the server URL below.',
      `Open Advanced settings and add a header named Authorization with the value ${bearer(key)}.`,
      'Click Test & save.',
    ],
    snippet: (url, key) => `URL: ${url}\nHeader: Authorization: ${bearer(key)}`,
  },
  {
    id: 'custom',
    name: 'Custom agent',
    keyName: '',
    where: 'Any MCP client, or your own server — Streamable HTTP, JSON-RPC over POST',
    snippet: (url, key) => json({ mcpServers: { replex: { url, headers: { Authorization: bearer(key) } } } }),
    extra: { label: 'Test from a terminal', code: curlTest },
    note: 'If your own app calls Replex, keep the key on its server and send the header from there — never put the key in browser code.',
  },
];
