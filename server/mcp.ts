import type { Request, Response } from 'express';
import type { TrendingWindow } from '../src/types/index.ts';
import { evaluateCompatibility } from '../src/engines/compatibility.ts';
import type { Caller } from './auth.ts';
import { HttpError } from './supabase.ts';
import { breakoutRepositories, getRepository, githubTokenFor, isValidFullName, risingRepositories, searchGithub } from './github.ts';
import {
  getCollection,
  listCollections,
  logAgentEvent,
  recentSearches,
  recordSearch,
  saveToCollection,
  summarizeRepository,
  targetStackFor,
} from './library.ts';

// Model Context Protocol over Streamable HTTP, stateless JSON responses.
// https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
const SUPPORTED_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
export const SERVER_INFO = { name: 'replex', title: 'Replex', version: '2.0.0' };

interface ToolDef {
  name: string;
  title: string;
  description: string;
  scope: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, boolean>;
  run: (args: Record<string, unknown>, caller: Caller) => Promise<unknown>;
}

/** Errors whose message is safe and useful to show the calling agent. */
class ToolInputError extends Error {}

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown, fallback: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(Math.floor(n), min), max) : fallback;
};
function fullNameArg(v: unknown): string {
  const value = str(v, 201).replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '');
  if (!isValidFullName(value)) throw new ToolInputError('full_name must look like "owner/repo"');
  return value;
}

const READ_ONLY = { readOnlyHint: true, openWorldHint: true };

export const TOOLS: ToolDef[] = [
  {
    name: 'search_repositories',
    scope: 'search:read',
    title: 'Search GitHub',
    description:
      'Live search across all public GitHub repositories. Supports free text plus filters for language, topic, recency and stars. Returns classified results with an agent-readiness score.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keywords, e.g. "reverse engineering decompiler" or "react video editor"' },
        language: { type: 'string', description: 'Primary language, e.g. "Rust"' },
        topic: { type: 'string', description: 'GitHub topic, e.g. "llm" or "reverse-engineering"' },
        sort: { type: 'string', enum: ['best', 'stars', 'updated', 'forks'] },
        created_within_days: { type: 'number', description: 'Only repositories created in the last N days' },
        min_stars: { type: 'number' },
        limit: { type: 'number', description: '1–25, default 10' },
      },
    },
    annotations: READ_ONLY,
    async run(args, caller) {
      const limit = num(args.limit, 10, 1, 25);
      const query = {
        q: str(args.query, 200),
        language: str(args.language, 50) || undefined,
        topic: str(args.topic, 50) || undefined,
        sort: (['best', 'stars', 'updated', 'forks'].includes(str(args.sort)) ? str(args.sort) : 'best') as 'best',
        createdWithinDays: args.created_within_days ? num(args.created_within_days, 0, 1, 3650) : undefined,
        minStars: args.min_stars ? num(args.min_stars, 0, 0, 1_000_000) : undefined,
        perPage: limit,
      };
      const result = await searchGithub(query, await githubTokenFor(caller.userId));
      recordSearch(caller.userId, query.q || result.query, { ...query, perPage: undefined }, 'mcp', result.total);
      return { githubQuery: result.query, total: result.total, results: result.items.map(summarizeRepository) };
    },
  },
  {
    name: 'trending_repositories',
    scope: 'search:read',
    title: 'Trending on GitHub',
    description:
      'What is gaining momentum: "rising" = repositories created in the window ranked by stars; "breakout" = created in the last 90 days and already past 1,000 stars.',
    inputSchema: {
      type: 'object',
      properties: {
        window: { type: 'string', enum: ['day', 'week', 'month'], description: 'Window for the rising list. Default "week"' },
        language: { type: 'string' },
        topic: { type: 'string', description: 'e.g. "ai-agents" or "reverse-engineering"' },
      },
    },
    annotations: READ_ONLY,
    async run(args, caller) {
      const window = (['day', 'week', 'month'].includes(str(args.window)) ? str(args.window) : 'week') as TrendingWindow;
      const filters = { language: str(args.language, 50) || undefined, topic: str(args.topic, 50) || undefined };
      const token = await githubTokenFor(caller.userId);
      const [rising, breakout] = await Promise.all([risingRepositories(window, filters, token), breakoutRepositories(filters, token)]);
      return { window, rising: rising.slice(0, 15).map(summarizeRepository), breakout: breakout.slice(0, 15).map(summarizeRepository) };
    },
  },
  {
    name: 'get_repository',
    scope: 'repositories:read',
    title: 'Repository details',
    description:
      'Full intelligence for one repository: purpose classification, stack evidence, agent-readiness checklist, install command, latest release and a README extract.',
    inputSchema: {
      type: 'object',
      properties: { full_name: { type: 'string', description: '"owner/repo" or a github.com URL' } },
      required: ['full_name'],
    },
    annotations: READ_ONLY,
    async run(args, caller) {
      const repo = await getRepository(fullNameArg(args.full_name), await githubTokenFor(caller.userId));
      return {
        ...summarizeRepository(repo),
        homepage: repo.homepageUrl,
        purpose: repo.purpose,
        stack: repo.stackEvidence,
        agentReadiness: repo.agentReadiness,
        installCommand: repo.installCommand,
        latestRelease: repo.latestRelease,
        readmeExtract: repo.readmeExtract?.slice(0, 2500),
      };
    },
  },
  {
    name: 'compare_repositories',
    scope: 'repositories:read',
    title: 'Compare repositories',
    description: 'Side-by-side comparison of 2–4 repositories, optionally scored against a target stack.',
    inputSchema: {
      type: 'object',
      properties: {
        full_names: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
        target_stack: { type: 'string', description: 'e.g. "Next.js + TypeScript + Tailwind". Defaults to your profile stack.' },
      },
      required: ['full_names'],
    },
    annotations: READ_ONLY,
    async run(args, caller) {
      const names = Array.isArray(args.full_names) ? args.full_names.slice(0, 4).map(fullNameArg) : [];
      if (names.length < 2) throw new ToolInputError('Provide 2–4 repositories in full_names');
      const token = await githubTokenFor(caller.userId);
      const stack = str(args.target_stack, 200) || (await targetStackFor(caller.userId));
      const repos = await Promise.all(names.map((n) => getRepository(n, token)));
      return {
        targetStack: stack || null,
        comparison: repos.map((r) => ({
          ...summarizeRepository(r),
          purpose: r.purpose.functionalPurpose,
          approach: r.purpose.implementationApproach,
          maturity: r.purpose.maturitySignals.status,
          frameworks: r.stackEvidence.frameworks,
          latestRelease: r.latestRelease?.tag ?? null,
          compatibility: stack ? evaluateCompatibility(r, stack).status : undefined,
        })),
      };
    },
  },
  {
    name: 'check_compatibility',
    scope: 'repositories:read',
    title: 'Check stack compatibility',
    description: 'Evidence-based check of whether a repository fits a target stack, listing supporting and missing evidence.',
    inputSchema: {
      type: 'object',
      properties: {
        full_name: { type: 'string' },
        target_stack: { type: 'string', description: 'Defaults to your profile stack' },
      },
      required: ['full_name'],
    },
    annotations: READ_ONLY,
    async run(args, caller) {
      const repo = await getRepository(fullNameArg(args.full_name), await githubTokenFor(caller.userId));
      const stack = str(args.target_stack, 200) || (await targetStackFor(caller.userId)) || 'Next.js + TypeScript';
      return { repository: repo.fullName, compatibility: evaluateCompatibility(repo, stack) };
    },
  },
  {
    name: 'list_collections',
    scope: 'library:read',
    title: 'My collections',
    description: "List the signed-in user's saved collections with item counts.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: (_args, caller) => listCollections(caller.userId),
  },
  {
    name: 'get_collection',
    scope: 'library:read',
    title: 'Open a collection',
    description: 'Get the repositories saved in one of my collections, by name or id.',
    inputSchema: { type: 'object', properties: { collection: { type: 'string' } }, required: ['collection'] },
    annotations: { readOnlyHint: true },
    run: (args, caller) => getCollection(caller.userId, str(args.collection, 120)),
  },
  {
    name: 'save_to_collection',
    scope: 'library:write',
    title: 'Save to collection',
    description: 'Save a repository to one of my collections. Creates the collection if it does not exist.',
    inputSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string', description: 'Collection name' },
        full_name: { type: 'string' },
        notes: { type: 'string', description: 'Why this repository matters' },
      },
      required: ['collection', 'full_name'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async run(args, caller) {
      const repo = await getRepository(fullNameArg(args.full_name), await githubTokenFor(caller.userId));
      return saveToCollection(caller.userId, str(args.collection, 120), repo, str(args.notes, 2000));
    },
  },
  {
    name: 'recent_searches',
    scope: 'library:read',
    title: 'My recent searches',
    description: 'My most recent Replex searches from the web app and agents.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', description: '1–50, default 10' } } },
    annotations: { readOnlyHint: true },
    run: (args, caller) => recentSearches(caller.userId, num(args.limit, 10, 1, 50)),
  },
];

const toolsByName = new Map(TOOLS.map((t) => [t.name, t]));

interface RpcMessage {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

function rpcError(id: RpcMessage['id'], code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

export async function handleMessage(msg: RpcMessage, caller: Caller) {
  const { id, method, params } = msg;
  switch (method) {
    case 'initialize': {
      const requested = String(params?.protocolVersion || '');
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions:
            'Replex searches all public GitHub repositories and keeps per-user collections. Prefer search_repositories for discovery, trending_repositories for momentum, and get_repository before recommending a dependency.',
        },
      };
    }
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };
    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: TOOLS.map(({ name, title, description, inputSchema, annotations }) => ({
            name,
            title,
            description,
            inputSchema,
            annotations,
          })),
        },
      };
    case 'tools/call': {
      const name = String(params?.name || '');
      const tool = toolsByName.get(name);
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${name}`);
      const args = (params?.arguments && typeof params.arguments === 'object' ? params.arguments : {}) as Record<string, unknown>;
      const started = Date.now();
      try {
        if (!caller.scopes.includes(tool.scope)) throw new ToolInputError(`This API key is missing the "${tool.scope}" scope`);
        const output = await tool.run(args, caller);
        logAgentEvent({ userId: caller.userId, apiKeyId: caller.apiKeyId, method, tool: name, ok: true, durationMs: Date.now() - started });
        const structured = Array.isArray(output) ? { items: output } : (output as Record<string, unknown>);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(output, null, 2) }], structuredContent: structured },
        };
      } catch (err) {
        logAgentEvent({ userId: caller.userId, apiKeyId: caller.apiKeyId, method, tool: name, ok: false, durationMs: Date.now() - started });
        // Only expected, user-meaningful errors reach the agent; anything else
        // is logged server-side and reported generically.
        const safe = err instanceof ToolInputError || err instanceof HttpError;
        if (!safe) console.error('[replex] mcp tool failed', name, err);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: safe ? (err as Error).message : 'Tool failed — please try again' }], isError: true },
        };
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export async function mcpHandler(req: Request, res: Response) {
  const caller = req.caller!;
  const body = req.body as RpcMessage | RpcMessage[] | undefined;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json(rpcError(null, -32600, 'Expected a single JSON-RPC 2.0 message'));
  }
  if (body.jsonrpc !== '2.0' || typeof body.method !== 'string') {
    return res.status(400).json(rpcError(body.id, -32600, 'Invalid JSON-RPC 2.0 request'));
  }
  // Notifications and client responses carry no id and get no body.
  if (body.id === undefined || body.id === null) return res.status(202).end();
  res.json(await handleMessage(body, caller));
}
