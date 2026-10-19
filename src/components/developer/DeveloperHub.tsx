import React, { useState } from 'react';
import {
  Terminal,
  Key,
  ShieldCheck,
  Copy,
  Check,
  Play,
  RefreshCw,
  Cpu,
  BookOpen,
  Activity,
  Layers,
} from 'lucide-react';
import type { ApiKey, Repository } from '../../types/index.ts';
import { storageService } from '../../services/storage.ts';
import { gitHubClient } from '../../services/githubClient.ts';
import { MCP_TOOLS, executeMcpTool } from '../../engines/mcp.ts';

interface DeveloperHubProps {
  apiKeys: ApiKey[];
  repositories: Repository[];
  onSelectRepository: (repo: Repository) => void;
}

export const DeveloperHub: React.FC<DeveloperHubProps> = ({
  apiKeys,
  repositories,
  onSelectRepository,
}) => {
  const [activeTab, setActiveTab] = useState<'mcp' | 'rest' | 'ingest' | 'keys'>('mcp');

  // MCP Sandbox
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

  // Ingestion
  const [repoQueryInput, setRepoQueryInput] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestionMessage, setIngestionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // API Keys
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<{ apiKey: ApiKey; rawSecret: string } | null>(null);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-[#1E2B3C]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#F2F6FA] tracking-tight">Developer & Agent Hub</h1>
          <p className="mt-1 text-xs text-[#718296]">
            Programmatic Model Context Protocol (MCP) server, REST API explorer, live GitHub ingestion, and keys.
          </p>
        </div>

        {/* Cohesive 4-Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-[#131B27] border border-[#1E2B3C] rounded-lg text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('mcp')}
            className={`px-3 py-1.5 font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'mcp' ? 'bg-[#1A2533] text-[#F2F6FA]' : 'text-[#718296] hover:text-[#F2F6FA]'
            }`}
          >
            MCP Protocol
          </button>
          <button
            onClick={() => setActiveTab('rest')}
            className={`px-3 py-1.5 font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'rest' ? 'bg-[#1A2533] text-[#F2F6FA]' : 'text-[#718296] hover:text-[#F2F6FA]'
            }`}
          >
            REST API
          </button>
          <button
            onClick={() => setActiveTab('ingest')}
            className={`px-3 py-1.5 font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'ingest' ? 'bg-[#1A2533] text-[#F2F6FA]' : 'text-[#718296] hover:text-[#F2F6FA]'
            }`}
          >
            Live Ingestion
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-3 py-1.5 font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'keys' ? 'bg-[#1A2533] text-[#F2F6FA]' : 'text-[#718296] hover:text-[#F2F6FA]'
            }`}
          >
            API Keys ({apiKeys.length})
          </button>
        </div>
      </div>

      {/* TAB 1: MCP PROTOCOL */}
      {activeTab === 'mcp' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#131B27] border border-[#1E2B3C] rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-bold text-[#F2F6FA]">Model Context Protocol (MCP) Specification</h2>
                  <span className="text-[10px] text-[#52D5C5] font-mono bg-[#52D5C5]/10 px-2 py-0.5 rounded">
                    JSON-RPC 2.0
                  </span>
                </div>
                <p className="text-xs text-[#A4B3C3] leading-relaxed max-w-2xl">
                  Connect autonomous AI coding agents (Claude Desktop, Cursor, custom agents) directly to Nexora's
                  repository intelligence without frontend web scraping.
                </p>
              </div>

              <button
                onClick={() =>
                  copyToClipboard(
                    JSON.stringify(
                      {
                        mcpServers: {
                          nexora: {
                            url: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/mcp`,
                          },
                        },
                      },
                      null,
                      2
                    ),
                    'mcp_config'
                  )
                }
                className="px-3 py-1.5 text-xs text-[#0B1018] bg-[#52D5C5] hover:bg-[#75E5D7] rounded-md font-semibold transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
              >
                {copiedText === 'mcp_config' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Agent Config</span>
              </button>
            </div>

            <div className="p-3.5 bg-[#0B1018] border border-[#1E2B3C] rounded-lg font-mono text-xs text-[#A4B3C3] overflow-x-auto">
              <span className="text-[#718296] block mb-1">// Add to claude_desktop_config.json:</span>
              {`{
  "mcpServers": {
    "nexora": {
      "url": "${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1/mcp"
    }
  }
}`}
            </div>
          </div>

          {/* Interactive Sandbox */}
          <div className="p-6 bg-[#131B27] border border-[#1E2B3C] rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#F2F6FA]">Interactive MCP Tool Sandbox</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block text-[#718296] mb-1 font-medium">Select Tool</label>
                  <select
                    value={selectedMcpTool}
                    onChange={(e) => {
                      const tool = e.target.value;
                      setSelectedMcpTool(tool);
                      if (tool === 'search_repositories') {
                        setMcpArgumentsInput(JSON.stringify({ query: 'video editor', limit: 3 }, null, 2));
                      } else if (tool === 'get_repository') {
                        setMcpArgumentsInput(JSON.stringify({ id: 'remotion-dev/remotion' }, null, 2));
                      } else if (tool === 'find_compatible_tools') {
                        setMcpArgumentsInput(JSON.stringify({ targetStack: 'Next.js + Tailwind', limit: 4 }, null, 2));
                      } else if (tool === 'compare_repositories') {
                        setMcpArgumentsInput(
                          JSON.stringify(
                            {
                              ids: ['remotion-dev/remotion', 'ffmpegwasm/ffmpeg.wasm'],
                              targetStack: 'React + TypeScript',
                            },
                            null,
                            2
                          )
                        );
                      }
                    }}
                    className="w-full h-9 px-2.5 bg-[#0B1018] border border-[#223044] rounded-md text-[#F2F6FA] focus:border-[#52D5C5]"
                  >
                    {MCP_TOOLS.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#718296] mb-1 font-medium">Arguments (JSON)</label>
                  <textarea
                    rows={6}
                    value={mcpArgumentsInput}
                    onChange={(e) => setMcpArgumentsInput(e.target.value)}
                    className="w-full p-2.5 bg-[#0B1018] border border-[#223044] rounded-md text-[#F2F6FA] font-mono text-xs focus:border-[#52D5C5]"
                  />
                </div>

                <button
                  onClick={runMcpTool}
                  disabled={mcpLoading}
                  className="px-4 py-2 bg-[#52D5C5] hover:bg-[#75E5D7] text-[#0B1018] font-semibold rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{mcpLoading ? 'Executing...' : 'Execute Tool'}</span>
                </button>
              </div>

              <div>
                <label className="block text-[#718296] mb-1 font-medium">Execution Response</label>
                <pre className="w-full h-[210px] p-3 bg-[#0B1018] border border-[#223044] rounded-md text-[#A4B3C3] font-mono text-xs overflow-y-auto whitespace-pre-wrap">
                  {mcpOutput || '// Click Execute Tool to inspect structured MCP response'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REST API */}
      {activeTab === 'rest' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#131B27] border border-[#1E2B3C] rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-[#F2F6FA]">REST API v1 Specification</h2>
            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-[#0B1018] border border-[#1E2B3C] rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-mono text-[#52D5C5] font-semibold mr-3">GET</span>
                  <span className="font-mono text-[#F2F6FA]">/api/v1/search?q={'{query}'}</span>
                </div>
                <span className="text-[#718296]">Search repositories with multi-signal ranking</span>
              </div>
              <div className="p-3 bg-[#0B1018] border border-[#1E2B3C] rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-mono text-[#52D5C5] font-semibold mr-3">GET</span>
                  <span className="font-mono text-[#F2F6FA]">/api/v1/repositories/:owner/:repo</span>
                </div>
                <span className="text-[#718296]">Get full repository intelligence sheet</span>
              </div>
              <div className="p-3 bg-[#0B1018] border border-[#1E2B3C] rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-mono text-[#FBBF24] font-semibold mr-3">POST</span>
                  <span className="font-mono text-[#F2F6FA]">/api/v1/compare</span>
                </div>
                <span className="text-[#718296]">Side-by-side comparison matrix</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#131B27] border border-[#1E2B3C] rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#F2F6FA]">Live Request Tester</h3>
            <div className="flex gap-2 text-xs">
              <input
                type="text"
                value={restEndpoint}
                onChange={(e) => setRestEndpoint(e.target.value)}
                className="flex-1 h-9 px-3 bg-[#0B1018] border border-[#223044] rounded-md text-[#F2F6FA] font-mono"
              />
              <button
                onClick={testRestEndpoint}
                disabled={restLoading}
                className="px-4 py-2 bg-[#52D5C5] hover:bg-[#75E5D7] text-[#0B1018] font-semibold rounded-md transition-colors"
              >
                Send Request
              </button>
            </div>
            <pre className="w-full h-44 p-3 bg-[#0B1018] border border-[#223044] rounded-md text-[#A4B3C3] font-mono text-xs overflow-y-auto whitespace-pre-wrap">
              {restResponse || '// Click Send Request to test endpoint'}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE INGESTION ENGINE */}
      {activeTab === 'ingest' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-[#131B27] border border-[#1E2B3C] rounded-xl">
              <span className="text-xs text-[#718296] font-medium block">Total Indexed</span>
              <span className="text-2xl font-bold font-mono text-[#F2F6FA] mt-1 block">
                {repositories.length}
              </span>
            </div>
            <div className="p-4 bg-[#131B27] border border-[#1E2B3C] rounded-xl">
              <span className="text-xs text-[#718296] font-medium block">GitHub API Quota</span>
              <span className="text-2xl font-bold font-mono text-[#52D5C5] mt-1 block">
                {rateLimit.remaining} / {rateLimit.limit}
              </span>
            </div>
            <div className="p-4 bg-[#131B27] border border-[#1E2B3C] rounded-xl">
              <span className="text-xs text-[#718296] font-medium block">Classification Latency</span>
              <span className="text-2xl font-bold font-mono text-[#34D399] mt-1 block">
                ~340ms
              </span>
            </div>
          </div>

          <div className="p-6 bg-[#131B27] border border-[#1E2B3C] rounded-2xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#F2F6FA]">Ingest Public GitHub Repository</h2>
              <p className="text-xs text-[#A4B3C3]">
                Fetch live metadata directly from GitHub's official API, extract framework manifests, compute purpose intelligence, and register into Nexora.
              </p>
            </div>

            <form onSubmit={handleIngest} className="flex flex-col sm:flex-row gap-3 max-w-xl text-xs">
              <input
                type="text"
                required
                value={repoQueryInput}
                onChange={(e) => setRepoQueryInput(e.target.value)}
                placeholder="e.g. facebook/react or astral-sh/uv"
                className="flex-1 h-10 px-3 bg-[#0B1018] border border-[#223044] rounded-md text-[#F2F6FA] focus:border-[#52D5C5]"
              />
              <button
                type="submit"
                disabled={isIngesting}
                className="h-10 px-4 bg-[#52D5C5] hover:bg-[#75E5D7] text-[#0B1018] font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isIngesting ? 'animate-spin' : ''}`} />
                <span>{isIngesting ? 'Ingesting...' : 'Ingest & Classify'}</span>
              </button>
            </form>

            {ingestionMessage && (
              <div
                className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
                  ingestionMessage.type === 'success'
                    ? 'bg-[#34D399]/10 border-[#34D399]/30 text-[#34D399]'
                    : 'bg-[#F87171]/10 border-[#F87171]/30 text-[#F87171]'
                }`}
              >
                {ingestionMessage.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: API KEYS */}
      {activeTab === 'keys' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#131B27] border border-[#1E2B3C] rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-[#F2F6FA]">Generate Scoped API Key</h2>
            <form onSubmit={handleCreateApiKey} className="flex gap-2 max-w-md text-xs">
              <input
                type="text"
                required
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key label (e.g. CI Agent, Local Worker)"
                className="flex-1 h-9 px-3 bg-[#0B1018] border border-[#223044] rounded-md text-[#F2F6FA]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#52D5C5] hover:bg-[#75E5D7] text-[#0B1018] font-semibold rounded-md shrink-0"
              >
                Generate Key
              </button>
            </form>

            {generatedKey && (
              <div className="p-4 bg-[#52D5C5]/10 border border-[#52D5C5]/30 rounded-xl space-y-2 text-xs">
                <span className="font-semibold text-[#52D5C5] block">
                  API Key Created (Save this now; it will not be displayed again):
                </span>
                <div className="p-2.5 bg-[#0B1018] font-mono text-xs text-[#F2F6FA] rounded flex items-center justify-between">
                  <span>{generatedKey.rawSecret}</span>
                  <button
                    onClick={() => copyToClipboard(generatedKey.rawSecret, 'api_secret')}
                    className="text-[#52D5C5] hover:underline"
                  >
                    {copiedText === 'api_secret' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-[#131B27] border border-[#1E2B3C] rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-[#F2F6FA]">Active API Keys ({apiKeys.length})</h3>
            <div className="space-y-2">
              {apiKeys.map((k) => (
                <div
                  key={k.id}
                  className="p-3 bg-[#0B1018] border border-[#1E2B3C] rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="font-semibold text-[#F2F6FA]">{k.name}</h4>
                    <span className="font-mono text-[11px] text-[#718296] block mt-0.5">
                      Prefix: {k.prefix}... · Created {new Date(k.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => storageService.revokeApiKey(k.id)}
                    className="text-[#718296] hover:text-[#F87171]"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
