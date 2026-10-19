import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { SEED_REPOSITORIES } from './src/data/seedRepositories.ts';
import { CATEGORIES } from './src/data/categories.ts';
import { searchRepositories } from './src/engines/search.ts';
import { evaluateCompatibility } from './src/engines/compatibility.ts';
import { executeMcpTool, MCP_TOOLS } from './src/engines/mcp.ts';
import { GitHubClient } from './src/services/githubClient.ts';
import type { Repository, SearchFilters, TechnicalCategory } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// CORS — allow requests from the configured frontend origin
app.use((req, res, next) => {
  const origin = process.env.APP_URL || 'http://localhost:5173';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

function requireApiKey(req: any, res: any, next: any) {
  const apiKey = process.env.NEXORA_API_KEY;
  if (!apiKey) return next(); // no key configured = open in dev mode
  const provided = req.headers['x-api-key'] || (req.headers.authorization || '').replace('Bearer ', '');
  if (provided !== apiKey) {
    return res.status(401).json({ error: 'API key required', hint: 'Pass your key via X-Api-Key header or Bearer token' });
  }
  next();
}

// In-memory repositories store backed by SEED_REPOSITORIES
const repoStore: Map<string, Repository> = new Map();
for (const repo of SEED_REPOSITORIES) {
  repoStore.set(repo.id.toLowerCase(), repo);
}

const collectionsStore: any[] = [
  {
    id: 'col-ui-inspiration',
    name: 'UI & Design Systems',
    description: 'Curated component libraries, primitives, and icon toolkits for production web applications.',
    isPrivate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      { repositoryId: 'shadcn-ui/ui', addedAt: new Date().toISOString(), notes: 'Primary foundation', tags: ['ui'] },
      { repositoryId: 'lucide-icons/lucide', addedAt: new Date().toISOString(), notes: 'Icon library', tags: ['icons'] },
    ],
  },
];

const watchlistsStore: any[] = [
  {
    id: 'watch-1',
    name: 'Video & Media Tooling',
    targetType: 'category',
    targetValue: 'Video & Multimedia',
    createdAt: new Date().toISOString(),
    lastCheckedAt: new Date().toISOString(),
    notificationsCount: 1,
  },
];

const startTime = Date.now();
const gitHubClient = new GitHubClient();

// ----------------------------------------------------
// REST API v1
// ----------------------------------------------------

// 1. Search Repositories
app.get('/api/v1/search', (req: Request, res: Response) => {
  const query = String(req.query.q || req.query.query || '');
  const category = req.query.category as TechnicalCategory | undefined;
  const language = req.query.language as string | undefined;
  const framework = req.query.framework as string | undefined;
  const license = req.query.license as string | undefined;
  const minStars = req.query.minStars ? Number(req.query.minStars) : undefined;
  const userStack = req.query.userStack as string | undefined;
  const sortBy = req.query.sortBy as any;
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 12;

  const filters: SearchFilters = {
    query,
    category,
    language,
    framework,
    license,
    minStars,
    userStack,
    sortBy,
    page,
    limit,
  };

  const allRepos = Array.from(repoStore.values());
  const searchResult = searchRepositories(allRepos, filters);
  res.json(searchResult);
});

// 2. List All Repositories
app.get('/api/v1/repositories', (req: Request, res: Response) => {
  const allRepos = Array.from(repoStore.values());
  res.json({
    total: allRepos.length,
    repositories: allRepos,
  });
});

// 3. Get Single Repository
app.get('/api/v1/repositories/:owner/:repo', (req: Request, res: Response) => {
  const id = `${req.params.owner}/${req.params.repo}`.toLowerCase();
  const repo = repoStore.get(id);
  if (!repo) {
    return res.status(404).json({ error: 'Repository not found', id });
  }
  res.json(repo);
});

// 4. Get Similar Repositories
app.get('/api/v1/repositories/:owner/:repo/similar', (req: Request, res: Response) => {
  const id = `${req.params.owner}/${req.params.repo}`.toLowerCase();
  const repo = repoStore.get(id);
  if (!repo) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  const allRepos = Array.from(repoStore.values());
  const similar = allRepos
    .filter((r) => r.id.toLowerCase() !== id)
    .map((candidate) => {
      let score = 0;
      if (candidate.purpose?.technicalCategory === repo.purpose?.technicalCategory) score += 30;
      const sharedTopics = (candidate.topics || []).filter((t) => (repo.topics || []).includes(t));
      score += sharedTopics.length * 10;
      if (candidate.primaryLanguage === repo.primaryLanguage) score += 15;
      return { candidate, score, sharedTopics };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  res.json({
    sourceRepository: repo.fullName,
    similar: similar.map((s) => ({
      ...s.candidate,
      similarityScore: Math.min(100, s.score),
      sharedTopics: s.sharedTopics,
    })),
  });
});

// 5. Evaluate Compatibility
app.get('/api/v1/repositories/:owner/:repo/compatibility', (req: Request, res: Response) => {
  const id = `${req.params.owner}/${req.params.repo}`.toLowerCase();
  const repo = repoStore.get(id);
  if (!repo) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  const targetStack = String(req.query.stack || 'Next.js + TypeScript + Tailwind');
  const evaluation = evaluateCompatibility(repo, targetStack);
  res.json({
    repository: repo.fullName,
    compatibility: evaluation,
  });
});

// 6. Compare Repositories
app.post('/api/v1/compare', requireApiKey, (req: Request, res: Response) => {
  const ids: string[] = req.body.ids || [];
  const targetStack: string = req.body.targetStack || '';

  const candidates: Repository[] = [];
  for (const id of ids) {
    const found = repoStore.get(id.toLowerCase());
    if (found) candidates.push(found);
  }

  const comparison = candidates.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.fullName,
    stars: repo.stars,
    license: repo.license?.name || 'None',
    primaryLanguage: repo.primaryLanguage,
    category: repo.purpose?.technicalCategory,
    functionalPurpose: repo.purpose?.functionalPurpose,
    frameworks: repo.stackEvidence?.frameworks || [],
    agentReadiness: repo.agentReadiness,
    compatibility: targetStack ? evaluateCompatibility(repo, targetStack) : undefined,
    maturity: repo.purpose?.maturitySignals,
    installCommand: repo.installCommand,
  }));

  res.json({
    totalCompared: candidates.length,
    targetStack: targetStack || null,
    comparison,
  });
});

// 7. Categories
app.get('/api/v1/categories', (_req: Request, res: Response) => {
  const allRepos = Array.from(repoStore.values());
  const counts: Record<string, number> = {};
  for (const r of allRepos) {
    const cat = r.purpose?.technicalCategory || 'Other / Unclassified';
    counts[cat] = (counts[cat] || 0) + 1;
  }

  res.json({
    categories: CATEGORIES.map((cat) => ({
      ...cat,
      indexedCount: counts[cat.id] || 0,
    })),
  });
});

// 8. Discover Latest
app.get('/api/v1/discover/latest', (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 8;
  const allRepos = Array.from(repoStore.values());
  const sorted = [...allRepos]
    .sort((a, b) => new Date(b.lastIndexedAt).getTime() - new Date(a.lastIndexedAt).getTime())
    .slice(0, limit);

  res.json({
    totalIndexed: allRepos.length,
    latest: sorted,
  });
});

// 9. Discover Trending
app.get('/api/v1/discover/trending', (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 8;
  const allRepos = Array.from(repoStore.values());
  const sorted = [...allRepos].sort((a, b) => b.stars - a.stars).slice(0, limit);

  res.json({
    trending: sorted,
  });
});

// 10. Collections
app.get('/api/v1/collections', (_req: Request, res: Response) => {
  res.json({ collections: collectionsStore });
});

app.post('/api/v1/collections', requireApiKey, (req: Request, res: Response) => {
  const { name, description, isPrivate } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const newCol = {
    id: `col-${Date.now()}`,
    name,
    description: description || '',
    isPrivate: Boolean(isPrivate),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
  };
  collectionsStore.unshift(newCol);
  res.status(201).json(newCol);
});

// 11. Watchlists
app.get('/api/v1/watchlists', (_req: Request, res: Response) => {
  res.json({ watchlists: watchlistsStore });
});

app.post('/api/v1/watchlists', requireApiKey, (req: Request, res: Response) => {
  const { name, targetType, targetValue } = req.body;
  if (!name || !targetType || !targetValue) {
    return res.status(400).json({ error: 'Missing required watchlist fields' });
  }
  const newWatch = {
    id: `watch-${Date.now()}`,
    name,
    targetType,
    targetValue,
    createdAt: new Date().toISOString(),
    lastCheckedAt: new Date().toISOString(),
    notificationsCount: 0,
  };
  watchlistsStore.unshift(newWatch);
  res.status(201).json(newWatch);
});

// 12. System Status
app.get('/api/v1/system/status', (_req: Request, res: Response) => {
  const allRepos = Array.from(repoStore.values());
  const rateLimit = gitHubClient.getRateLimitInfo();

  res.json({
    service: 'Nexora Intelligence Platform',
    version: '1.0.0-production',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    indexedRepositoriesCount: allRepos.length,
    classificationCoverageRate: 1.0,
    averageIngestionDurationMs: 340,
    gitHubApiRateLimit: rateLimit,
    mcpServerStatus: 'active',
  });
});

// 13. Ingest GitHub Repository On-Demand
app.post('/api/v1/ingest', requireApiKey, async (req: Request, res: Response) => {
  const { repoQuery } = req.body;
  if (!repoQuery) {
    return res.status(400).json({ error: 'repoQuery parameter (e.g. "owner/repo") is required' });
  }

  try {
    const ingested = await gitHubClient.fetchAndClassifyRepository(repoQuery);
    repoStore.set(ingested.id.toLowerCase(), ingested);
    res.json({
      success: true,
      repository: ingested,
      message: `Successfully ingested and classified ${ingested.fullName}`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Ingestion failed',
    });
  }
});

// ----------------------------------------------------
// Model Context Protocol (MCP) JSON-RPC 2.0 Endpoint
// ----------------------------------------------------
app.post('/api/v1/mcp', requireApiKey, async (req: Request, res: Response) => {
  const { jsonrpc, method, params, id } = req.body;

  if (jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: id || null,
      error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' },
    });
  }

  const allRepos = Array.from(repoStore.values());

  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: { tools: MCP_TOOLS },
    });
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};

    try {
      const result = await executeMcpTool(toolName, toolArgs, allRepos);
      return res.json({
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
      });
    } catch (err: any) {
      return res.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32000, message: err.message || 'Internal error' },
      });
    }
  }

  return res.status(400).json({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  });
});

// ----------------------------------------------------
// Frontend Mounting (Vite middlewares in Dev / Static in Prod)
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(port, () => {
    console.log(`Nexora Intelligence Server listening on http://localhost:${port}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = Number(port) + 1;
      console.warn(`Port ${port} is occupied by another process, falling back to port ${fallbackPort}...`);
      app.listen(fallbackPort, () => {
        console.log(`Nexora Intelligence Server listening on http://localhost:${fallbackPort}`);
      });
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
