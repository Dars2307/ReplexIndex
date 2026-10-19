import type { Repository } from '../types/index.ts';
import { classifyRepository } from '../engines/classification.ts';
import { evaluateAgentReadiness } from '../engines/readiness.ts';

export interface GitHubRateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: string;
}

export class GitHubClient {
  private lastRateLimit: GitHubRateLimitInfo = {
    limit: 60,
    remaining: 59,
    resetAt: new Date(Date.now() + 3600000).toISOString(),
  };

  public getRateLimitInfo(): GitHubRateLimitInfo {
    return this.lastRateLimit;
  }

  private updateRateLimitFromHeaders(headers: Headers) {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');

    if (limit && remaining) {
      this.lastRateLimit = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        resetAt: reset ? new Date(parseInt(reset, 10) * 1000).toISOString() : this.lastRateLimit.resetAt,
      };
    }
  }

  public async fetchAndClassifyRepository(repoQuery: string): Promise<Repository> {
    const cleanQuery = repoQuery.replace(/^https?:\/\/github\.com\//, '').trim().replace(/\/$/, '');
    const parts = cleanQuery.split('/');
    if (parts.length < 2) {
      throw new Error(`Invalid repository format. Please provide "owner/repo" (e.g. "facebook/react").`);
    }

    const [owner, repoName] = parts;
    const url = `https://api.github.com/repos/${owner}/${repoName}`;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Replex-Agent-Intelligence/1.0',
    };

    const res = await fetch(url, { headers });
    this.updateRateLimitFromHeaders(res.headers);

    if (res.status === 404) {
      throw new Error(`GitHub repository "${owner}/${repoName}" was not found or is private.`);
    }

    if (res.status === 403) {
      const msg = await res.text();
      throw new Error(`GitHub API rate limit reached. Reset at: ${this.lastRateLimit.resetAt}. Raw message: ${msg}`);
    }

    if (!res.ok) {
      throw new Error(`GitHub API returned error HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    // Try fetching README extract safely
    let readmeText = '';
    try {
      const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/readme`, {
        headers: {
          Accept: 'application/vnd.github.raw+json',
          'User-Agent': 'Replex-Agent-Intelligence/1.0',
        },
      });
      if (readmeRes.ok) {
        readmeText = (await readmeRes.text()).slice(0, 3000); // limited safe extract
      }
    } catch {
      // README is optional
    }

    const topics: string[] = Array.isArray(data.topics) ? data.topics : [];
    const primaryLanguage = data.language || 'Unknown';

    // Run Purpose Intelligence Engine
    const purpose = classifyRepository({
      name: data.name,
      description: data.description || '',
      topics,
      primaryLanguage,
      readmeText,
    });

    // Run Stack Evidence Extractor
    const frameworks: string[] = [];
    const buildTools: string[] = [];
    const runtimes: string[] = [];
    const configFileDetected: string[] = [];

    const lowerText = `${data.name} ${data.description || ''} ${topics.join(' ')} ${readmeText}`.toLowerCase();
    if (lowerText.includes('react')) frameworks.push('React');
    if (lowerText.includes('next.js') || lowerText.includes('nextjs')) frameworks.push('Next.js');
    if (lowerText.includes('vue')) frameworks.push('Vue');
    if (lowerText.includes('svelte')) frameworks.push('Svelte');
    if (lowerText.includes('tailwind')) frameworks.push('Tailwind CSS');
    if (lowerText.includes('fastapi')) frameworks.push('FastAPI');
    if (lowerText.includes('express')) frameworks.push('Express');
    if (lowerText.includes('hono')) frameworks.push('Hono');

    if (lowerText.includes('vite')) buildTools.push('Vite');
    if (lowerText.includes('turbopack') || lowerText.includes('turborepo')) buildTools.push('Turborepo');
    if (lowerText.includes('webpack')) buildTools.push('Webpack');
    if (lowerText.includes('cargo')) buildTools.push('Cargo');

    if (primaryLanguage === 'TypeScript' || primaryLanguage === 'JavaScript') runtimes.push('Node.js', 'Browser');
    if (primaryLanguage === 'Python') runtimes.push('Python 3.9+');
    if (primaryLanguage === 'Rust') runtimes.push('Native Rust toolchain');
    if (primaryLanguage === 'Go') runtimes.push('Go runtime');

    configFileDetected.push('package.json');

    // Default install command heuristic
    let installCommand = '';
    if (['TypeScript', 'JavaScript'].includes(primaryLanguage)) {
      installCommand = `npm install ${data.name}`;
    } else if (primaryLanguage === 'Python') {
      installCommand = `pip install ${data.name}`;
    } else if (primaryLanguage === 'Rust') {
      installCommand = `cargo add ${data.name}`;
    } else if (primaryLanguage === 'Go') {
      installCommand = `go get ${data.html_url.replace('https://', '')}`;
    }

    // Agent Readiness Evaluation
    const agentReadiness = evaluateAgentReadiness({
      license: data.license
        ? {
            key: data.license.key,
            name: data.license.name,
            spdxId: data.license.spdx_id || 'UNKNOWN',
          }
        : null,
      isArchived: Boolean(data.archived),
      pushedAt: data.pushed_at,
      primaryLanguage,
      readmeExtract: readmeText,
      installCommand,
      stackEvidence: {
        frameworks,
        buildTools,
        packageManagers: ['npm'],
        runtimes,
        keyDependencies: [],
        configFileDetected,
      },
    });

    const now = new Date().toISOString();

    const repository: Repository = {
      id: data.full_name,
      name: data.name,
      fullName: data.full_name,
      owner: {
        login: data.owner?.login || owner,
        avatarUrl: data.owner?.avatar_url || 'https://github.com/github.png',
        htmlUrl: data.owner?.html_url || `https://github.com/${owner}`,
      },
      htmlUrl: data.html_url,
      description: data.description || 'Public GitHub repository.',
      homepageUrl: data.homepage || null,
      primaryLanguage,
      languages: [primaryLanguage],
      topics,
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      openIssues: data.open_issues_count || 0,
      license: data.license
        ? {
            key: data.license.key,
            name: data.license.name,
            spdxId: data.license.spdx_id || 'NOASSERTION',
          }
        : null,
      isArchived: Boolean(data.archived),
      isTemplate: Boolean(data.is_template),
      visibility: data.private ? 'private' : 'public',
      sourceProvider: 'github',
      createdAt: data.created_at,
      pushedAt: data.pushed_at,
      lastUpstreamUpdate: data.updated_at,
      discoveredAt: now,
      lastIndexedAt: now,
      lastClassifiedAt: now,
      purpose,
      agentReadiness,
      stackEvidence: {
        frameworks,
        buildTools,
        packageManagers: ['npm'],
        runtimes,
        keyDependencies: [],
        configFileDetected,
      },
      relationships: [],
      readmeExtract: readmeText,
      readmeUrl: `https://raw.githubusercontent.com/${data.full_name}/${data.default_branch || 'main'}/README.md`,
      installCommand,
    };

    return repository;
  }
}

export const gitHubClient = new GitHubClient();
