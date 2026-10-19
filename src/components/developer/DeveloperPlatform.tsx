import React, { useState } from 'react';
import {
  Terminal,
  Key,
  ShieldCheck,
  Copy,
  Check,
  Play,
  BookOpen,
  Code2,
  Sparkles,
  Database,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { ApiKey, Repository } from '../../types/index.ts';
import { storageService } from '../../services/storage.ts';
import { MCP_TOOLS, executeMcpTool } from '../../engines/mcp.ts';
import { gitHubClient } from '../../services/githubClient.ts';

interface DeveloperPlatformProps {
  apiKeys: ApiKey[];
  repositories: Repository[];
  onSelectRepository: (repo: Repository) => void;
}

export const DeveloperPlatform: React.FC<DeveloperPlatformProps> = ({
  apiKeys,
  repositories,
  onSelectRepository,
}) => {
  const [activeTab, setActiveTab] = useState<'mcp' | 'rest' | 'keys' | 'ingest'>('mcp');

  // Keys state
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<{ apiKey: ApiKey; rawSecret: string } | null>(null);

  // MCP Sandbox Runner
  const [selectedMcpTool, setSelectedMcpTool] = useState<string>('search_repositories');
  const [mcpArgumentsInput, setMcpArgumentsInput] = useState<string>(
    JSON.stringify({ query: 'video editor', limit: 3 }, null, 2)
  );
  const [mcpOutput, setMcpOutput] = useState<string>('');
  const [mcpLoading, setMcpLoading] = useState(false);

  // REST Live Tester
  const [restEndpoint, setRestEndpoint] = useState<string>('/api/v1/search?q=react&limit=3');
  const [restResponse, setRestResponse] = useState<string>('');
  const [restLoading, setRestLoading] = useState(false);

  // Ingestion state
  const [repoQueryInput, setRepoQueryInput] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestionMessage, setIngestionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const rateLimit = gitHubClient.getRateLimitInfo();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const result = storageService.createApiKey(newKeyName.trim());
    setGeneratedKey(result);
    setNewKeyName('');
  };

  const runMcpTool = async () => {
    setMcpLoading(true);
    setMcpOutput('');
    try {
      const parsedArgs = JSON.parse(mcpArgumentsInput);
      const result = await executeMcpTool(selectedMcpTool, parsedArgs, repositories);
      setMcpOutput(JSON.stringify(result, null, 2));
    } catch (err: any) {
      setMcpOutput(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setMcpLoading(false);
    }
  };

  const testRestEndpoint = async () => {
    setRestLoading(true);
    setRestResponse('');
    try {
      const res = await fetch(restEndpoint);
      const data = await res.json();
      setRestResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setRestResponse(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setRestLoading(false);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoQueryInput.trim()) return;
    setIsIngesting(true);
    setIngestionMessage(null);
    try {
      const repo = await gitHubClient.fetchAndClassifyRepository(repoQueryInput.trim());
      storageService.addOrUpdateRepository(repo);
      setIngestionMessage({
        type: 'success',
        text: `Successfully ingested and classified ${repo.fullName} (${repo.purpose?.technicalCategory}) with ${repo.agentReadiness?.score}% agent readiness!`,
      });
      setRepoQueryInput('');
    } catch (err: any) {
      setIngestionMessage({
        type: 'error',
        text: err.message || 'Failed to ingest repository.',
      });
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">Platform & Developer Portal</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Model Context Protocol (MCP) server, REST API endpoints, programmatic keys, and live ingestion diagnostics.
          </p>
        </div>

        {/* Tab Controls (Supabase dashboard pill style) */}
        <div className="flex items-center gap-1 p-1 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl text-xs overflow-x-auto self-start sm:self-auto shadow-xs">
          <button
            onClick={() => setActiveTab('mcp')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'mcp' ? 'bg-[var(--surface-2)] text-[var(--text-primary)] font-bold shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            MCP Protocol Server
          </button>
          <button
            onClick={() => setActiveTab('rest')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'rest' ? 'bg-[var(--surface-2)] text-[var(--text-primary)] font-bold shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            REST API
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'keys' ? 'bg-[var(--surface-2)] text-[var(--text-primary)] font-bold shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            API Keys ({apiKeys.length})
          </button>
          <button
            onClick={() => setActiveTab('ingest')}
            className={`px-3 py-1.5 font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ingest' ? 'bg-[var(--surface-2)] text-[var(--accent)] font-bold shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Live Ingestion</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MCP PROTOCOL SERVER */}
      {activeTab === 'mcp' && (
        <div className="space-y-6 text-xs">
          <div className="p-5 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Autonomous Agent MCP Integration</h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Connect Claude Code, Cursor, Windsurf, or custom AI coding agents to Replex via the Model Context Protocol.
              </p>
            </div>
            <button
              onClick={() =>
                copyToClipboard(
                  JSON.stringify(
                    {
                      mcpServers: {
                        replex: {
                          command: 'node',
                          args: ['server.js'],
                          env: { REPLEX_API_KEY: 'your-api-key-here' },
                        },
                      },
                    },
                    null,
                    2
                  ),
                  'mcp-config'
                )
              }
              className="px-3.5 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-xl transition-colors flex items-center gap-2 shrink-0 font-medium cursor-pointer"
            >
              {copiedText === 'mcp-config' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--accent)]" />}
              <span>{copiedText === 'mcp-config' ? 'Copied Config' : 'Copy MCP Config JSON'}</span>
            </button>
          </div>

          {/* Interactive Tool Sandbox */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Interactive MCP Tool Sandbox</h3>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-medium">Select MCP Tool</label>
                <select
                  value={selectedMcpTool}
                  onChange={(e) => {
                    const toolName = e.target.value;
                    setSelectedMcpTool(toolName);
                    if (toolName === 'search_repositories') {
                      setMcpArgumentsInput(JSON.stringify({ query: 'video editor', limit: 3 }, null, 2));
                    } else if (toolName === 'get_repository') {
                      setMcpArgumentsInput(JSON.stringify({ repoId: 'remotion-dev/remotion' }, null, 2));
                    } else if (toolName === 'compare_repositories') {
                      setMcpArgumentsInput(JSON.stringify({ repoIds: ['remotion-dev/remotion', 'ffmpegwasm/ffmpeg.wasm'], userStack: 'Next.js TypeScript' }, null, 2));
                    } else if (toolName === 'explain_repository') {
                      setMcpArgumentsInput(JSON.stringify({ repoId: 'remotion-dev/remotion', userStack: 'React + Vite' }, null, 2));
                    }
                  }}
                  className="w-full h-10 px-3 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-mono text-xs focus:border-[var(--accent)]"
                >
                  {MCP_TOOLS.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} — {t.description.slice(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-medium">JSON Arguments</label>
                <textarea
                  rows={5}
                  value={mcpArgumentsInput}
                  onChange={(e) => setMcpArgumentsInput(e.target.value)}
                  className="w-full p-3 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] font-mono text-xs focus:border-[var(--accent)]"
                />
              </div>

              <button
                onClick={runMcpTool}
                disabled={mcpLoading}
                className="w-full py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0B1018] font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{mcpLoading ? 'Executing Tool...' : 'Execute MCP Tool'}</span>
              </button>
            </div>

            {/* Sandbox Output Console */}
            <div className="p-5 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-2xl flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--border-subtle)]">
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">Output Stream (JSON-RPC Response)</span>
                  {mcpOutput && (
                    <button
                      onClick={() => copyToClipboard(mcpOutput, 'mcp-output')}
                      className="text-[var(--accent)] hover:underline text-[11px] font-mono cursor-pointer"
                    >
                      {copiedText === 'mcp-output' ? 'Copied' : 'Copy Output'}
                    </button>
                  )}
                </div>
                <pre className="text-[11px] font-mono text-[var(--text-primary)] overflow-x-auto max-h-[340px] whitespace-pre-wrap leading-relaxed">
                  {mcpOutput || '// Run an MCP tool from the left panel to inspect deterministic intelligence output.'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REST API REFERENCE */}
      {activeTab === 'rest' && (
        <div className="space-y-6 text-xs">
          <div className="p-5 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Programmatic REST API Tester</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={restEndpoint}
                onChange={(e) => setRestEndpoint(e.target.value)}
                className="flex-1 h-10 px-3 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-xl font-mono text-xs text-[var(--text-primary)] focus:border-[var(--accent)]"
              />
              <button
                onClick={testRestEndpoint}
                disabled={restLoading}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0B1018] font-bold rounded-xl transition-colors cursor-pointer"
              >
                {restLoading ? 'Calling...' : 'Send Request'}
              </button>
            </div>

            {restResponse && (
              <div className="mt-4 p-4 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-xl font-mono text-[11px] max-h-[350px] overflow-auto">
                <pre className="text-[var(--text-primary)]">{restResponse}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: API KEYS */}
      {activeTab === 'keys' && (
        <div className="space-y-6 text-xs">
          <div className="p-5 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Manage Programmatic API Keys</h2>
            <form onSubmit={handleCreateApiKey} className="flex gap-2 max-w-md">
              <input
                type="text"
                required
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key label (e.g. Cursor agent, CI Runner)"
                className="flex-1 h-9 px-3 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0B1018] font-bold rounded-xl transition-colors cursor-pointer"
              >
                Generate Key
              </button>
            </form>

            {generatedKey && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                <span className="text-xs font-bold text-emerald-400">API Key Created! Copy it now:</span>
                <div className="flex items-center justify-between font-mono text-xs text-[var(--text-primary)] bg-[var(--canvas)] p-2 rounded">
                  <span>{generatedKey.rawSecret}</span>
                  <button
                    onClick={() => copyToClipboard(generatedKey.rawSecret, 'api-secret')}
                    className="text-[var(--accent)] hover:underline"
                  >
                    {copiedText === 'api-secret' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-[var(--border-subtle)] pt-2">
              {apiKeys.map((k) => (
                <div key={k.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[var(--text-primary)]">{k.name}</span>
                    <span className="text-[11px] text-[var(--text-muted)] font-mono ml-3">{k.keyPrefix}...</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">Created {new Date(k.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LIVE INGESTION */}
      {activeTab === 'ingest' && (
        <div className="space-y-6 text-xs">
          <div className="p-5 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Live Ingestion & Metadata Classifier</h2>
            <p className="text-[var(--text-secondary)]">
              Submit any GitHub repository (e.g. `facebook/react`, `tailwindlabs/tailwindcss`) to parse manifests, evaluate compatibility, and register into your local catalog.
            </p>
            <form onSubmit={handleIngest} className="flex gap-2 max-w-lg">
              <input
                type="text"
                required
                value={repoQueryInput}
                onChange={(e) => setRepoQueryInput(e.target.value)}
                placeholder="owner/repo (e.g. vercel/swr)"
                className="flex-1 h-10 px-3 bg-[var(--canvas)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] font-mono focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                disabled={isIngesting}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0B1018] font-bold rounded-xl transition-colors cursor-pointer"
              >
                {isIngesting ? 'Ingesting...' : 'Ingest Repository'}
              </button>
            </form>

            {ingestionMessage && (
              <div
                className={`p-4 rounded-xl border ${
                  ingestionMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}
              >
                {ingestionMessage.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
