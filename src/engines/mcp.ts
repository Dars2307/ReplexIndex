import type { McpToolDefinition, Repository } from '../types/index.ts';
import { evaluateCompatibility } from './compatibility.ts';
import { searchRepositories } from './search.ts';

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'search_repositories',
    description: 'Search indexed software repositories using natural language, category, or framework filters with purpose intelligence.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query or keywords (e.g. "React video editor")' },
        category: { type: 'string', description: 'Technical category to filter by (e.g. "Video & Multimedia", "Design & UI")' },
        framework: { type: 'string', description: 'Framework filter (e.g. "React", "Next.js", "FastAPI")' },
        userStack: { type: 'string', description: 'Caller environment stack for compatibility evaluation (e.g. "Next.js + TypeScript")' },
        limit: { type: 'number', description: 'Maximum number of items to return (default 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_repository',
    description: 'Retrieve detailed metadata, purpose classification, and agent readiness for a specific repository by ID or full name.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Repository identifier in "owner/repo" format' },
      },
      required: ['id'],
    },
  },
  {
    name: 'find_similar_repositories',
    description: 'Discover alternative or complementary repositories based on functional purpose, technology stack, and shared relationships.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Source repository identifier (e.g. "remotion-dev/remotion")' },
        limit: { type: 'number', description: 'Number of similar repositories to return' },
      },
      required: ['id'],
    },
  },
  {
    name: 'compare_repositories',
    description: 'Perform a structured side-by-side comparison of 2 to 4 repositories covering purpose, tech stack, license, readiness, and tradeoffs.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of 2 to 4 repository identifiers ("owner/repo")',
        },
        targetStack: { type: 'string', description: 'Optional target stack to evaluate compatibility across all candidates' },
      },
      required: ['ids'],
    },
  },
  {
    name: 'find_compatible_tools',
    description: 'Filter repositories guaranteed or highly likely to integrate with a specific technical stack.',
    inputSchema: {
      type: 'object',
      properties: {
        targetStack: { type: 'string', description: 'Target technical stack (e.g. "Next.js + Tailwind + TypeScript")' },
        category: { type: 'string', description: 'Optional category filter' },
        limit: { type: 'number', description: 'Max results' },
      },
      required: ['targetStack'],
    },
  },
  {
    name: 'get_latest_discoveries',
    description: 'Retrieve the most recently indexed or updated repositories with freshness timestamps.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Count of latest discoveries to return (default 10)' },
      },
    },
  },
  {
    name: 'list_categories',
    description: 'List all top-level technical categories and subcategories in the Replex taxonomy.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'explain_repository',
    description: 'Provides a structured plain-language architectural explanation of what a repository solves, who it is for, and how to integrate it.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Repository identifier' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_repository_relationships',
    description: 'Retrieve the evidence-backed graph relationships for a repository (alternatives, complementary tools, ecosystem links).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Repository identifier' },
      },
      required: ['id'],
    },
  },
];

export async function executeMcpTool(
  name: string,
  args: Record<string, unknown>,
  repositories: Repository[]
): Promise<unknown> {
  switch (name) {
    case 'search_repositories': {
      const query = String(args.query || '');
      const category = args.category as any;
      const framework = args.framework ? String(args.framework) : undefined;
      const userStack = args.userStack ? String(args.userStack) : undefined;
      const limit = Number(args.limit) || 10;

      const searchResult = searchRepositories(repositories, {
        query,
        category,
        framework,
        userStack,
        limit,
      });

      return {
        query,
        count: searchResult.results.length,
        totalMatches: searchResult.total,
        interpretation: searchResult.queryInterpretation,
        repositories: searchResult.results.map((r) => ({
          id: r.id,
          name: r.name,
          fullName: r.fullName,
          htmlUrl: r.htmlUrl,
          description: r.description,
          category: r.purpose?.technicalCategory,
          functionalPurpose: r.purpose?.functionalPurpose,
          agentReadinessScore: r.agentReadiness?.score,
          stars: r.stars,
          primaryLanguage: r.primaryLanguage,
          compatibility: userStack ? evaluateCompatibility(r, userStack) : undefined,
        })),
      };
    }

    case 'get_repository': {
      const id = String(args.id || '').toLowerCase();
      const repo = repositories.find((r) => r.id.toLowerCase() === id || r.name.toLowerCase() === id);
      if (!repo) {
        throw new Error(`Repository "${args.id}" not found in indexed collection.`);
      }
      return repo;
    }

    case 'find_similar_repositories': {
      const id = String(args.id || '').toLowerCase();
      const repo = repositories.find((r) => r.id.toLowerCase() === id || r.name.toLowerCase() === id);
      if (!repo) {
        throw new Error(`Repository "${args.id}" not found.`);
      }

      const limit = Number(args.limit) || 5;
      // Find explicitly related or matching category & topics
      const similar = repositories
        .filter((r) => r.id !== repo.id)
        .map((candidate) => {
          let score = 0;
          if (candidate.purpose?.technicalCategory === repo.purpose?.technicalCategory) score += 30;
          const sharedTopics = (candidate.topics || []).filter((t) => (repo.topics || []).includes(t));
          score += sharedTopics.length * 10;
          if (candidate.primaryLanguage === repo.primaryLanguage) score += 15;
          return { candidate, score, sharedTopics };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return {
        sourceRepository: repo.fullName,
        similarRepositories: similar.map((s) => ({
          id: s.candidate.id,
          name: s.candidate.name,
          fullName: s.candidate.fullName,
          category: s.candidate.purpose?.technicalCategory,
          similarityScore: Math.min(100, s.score),
          sharedTopics: s.sharedTopics,
          description: s.candidate.description,
          htmlUrl: s.candidate.htmlUrl,
        })),
      };
    }

    case 'compare_repositories': {
      const ids = (args.ids as string[]) || [];
      const candidates = repositories.filter((r) =>
        ids.map((id) => id.toLowerCase()).includes(r.id.toLowerCase())
      );

      const targetStack = args.targetStack ? String(args.targetStack) : undefined;

      return {
        comparisonCount: candidates.length,
        targetStackEvaluated: targetStack || 'None specified',
        comparison: candidates.map((repo) => ({
          id: repo.id,
          name: repo.name,
          category: repo.purpose?.technicalCategory,
          functionalPurpose: repo.purpose?.functionalPurpose,
          license: repo.license?.name || 'Unknown',
          stars: repo.stars,
          frameworks: repo.stackEvidence?.frameworks || [],
          agentReadinessScore: repo.agentReadiness?.score,
          compatibility: targetStack ? evaluateCompatibility(repo, targetStack) : undefined,
          maturity: repo.purpose?.maturitySignals,
          implementationApproach: repo.purpose?.implementationApproach,
        })),
      };
    }

    case 'find_compatible_tools': {
      const targetStack = String(args.targetStack || '');
      const limit = Number(args.limit) || 10;
      const category = args.category as any;

      let pool = repositories;
      if (category && category !== 'All') {
        pool = pool.filter((r) => r.purpose?.technicalCategory === category);
      }

      const evaluated = pool
        .map((r) => ({ repo: r, compat: evaluateCompatibility(r, targetStack) }))
        .filter((item) => ['confirmed_match', 'potential_match'].includes(item.compat.status))
        .sort((a, b) => {
          if (a.compat.status === 'confirmed_match' && b.compat.status !== 'confirmed_match') return -1;
          if (b.compat.status === 'confirmed_match' && a.compat.status !== 'confirmed_match') return 1;
          return b.repo.stars - a.repo.stars;
        })
        .slice(0, limit);

      return {
        targetStack,
        matchesCount: evaluated.length,
        compatibleRepositories: evaluated.map((e) => ({
          id: e.repo.id,
          name: e.repo.name,
          category: e.repo.purpose?.technicalCategory,
          status: e.compat.status,
          supportingEvidence: e.compat.supportingEvidence,
          potentialIntegrationComplexity: e.compat.potentialIntegrationComplexity,
          agentReadiness: e.repo.agentReadiness?.score,
          htmlUrl: e.repo.htmlUrl,
        })),
      };
    }

    case 'get_latest_discoveries': {
      const limit = Number(args.limit) || 10;
      const sorted = [...repositories]
        .sort((a, b) => new Date(b.lastIndexedAt).getTime() - new Date(a.lastIndexedAt).getTime())
        .slice(0, limit);

      return {
        totalIndexed: repositories.length,
        latestDiscoveries: sorted.map((r) => ({
          id: r.id,
          name: r.name,
          category: r.purpose?.technicalCategory,
          discoveredAt: r.discoveredAt,
          lastIndexedAt: r.lastIndexedAt,
          stars: r.stars,
          description: r.description,
        })),
      };
    }

    case 'list_categories': {
      const categoryCounts: Record<string, number> = {};
      for (const r of repositories) {
        const cat = r.purpose?.technicalCategory || 'Other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
      return {
        categories: Object.entries(categoryCounts).map(([name, count]) => ({
          name,
          indexedRepositoriesCount: count,
        })),
      };
    }

    case 'explain_repository': {
      const id = String(args.id || '').toLowerCase();
      const repo = repositories.find((r) => r.id.toLowerCase() === id || r.name.toLowerCase() === id);
      if (!repo) {
        throw new Error(`Repository "${args.id}" not found.`);
      }

      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        summary: repo.purpose?.functionalPurpose,
        category: repo.purpose?.technicalCategory,
        subcategories: repo.purpose?.subcategories,
        intendedAudience: repo.purpose?.intendedAudience,
        implementationApproach: repo.purpose?.implementationApproach,
        supportedEnvironments: repo.purpose?.supportedEnvironments,
        installCommand: repo.installCommand || `npm install ${repo.name}`,
        agentReadiness: repo.agentReadiness,
        stackEvidence: repo.stackEvidence,
      };
    }

    case 'get_repository_relationships': {
      const id = String(args.id || '').toLowerCase();
      const repo = repositories.find((r) => r.id.toLowerCase() === id || r.name.toLowerCase() === id);
      if (!repo) {
        throw new Error(`Repository "${args.id}" not found.`);
      }

      return {
        repository: repo.fullName,
        relationships: repo.relationships || [],
      };
    }

    default:
      throw new Error(`Unknown MCP tool: ${name}`);
  }
}
