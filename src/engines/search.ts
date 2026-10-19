import type { Repository, SearchFacets, SearchFilters, SearchResponse } from '../types/index.ts';
import { evaluateCompatibility } from './compatibility.ts';

export function searchRepositories(
  repositories: Repository[],
  filters: SearchFilters
): SearchResponse {
  const query = (filters.query || '').trim().toLowerCase();
  const queryTokens = query.split(/\s+/).filter(Boolean);

  // Intent interpretation
  let detectedIntent = 'Broad exploration';
  let inferredCategory: string | undefined = undefined;
  if (query.includes('video') || query.includes('edit') || query.includes('timeline') || query.includes('ffmpeg')) {
    detectedIntent = 'Video & Multimedia tooling discovery';
    inferredCategory = 'Video & Multimedia';
  } else if (query.includes('ui') || query.includes('component') || query.includes('icon') || query.includes('animation') || query.includes('tailwind')) {
    detectedIntent = 'Design & UI component discovery';
    inferredCategory = 'Design & UI';
  } else if (query.includes('ai') || query.includes('agent') || query.includes('llm') || query.includes('rag')) {
    detectedIntent = 'AI & Machine Learning infrastructure discovery';
    inferredCategory = 'AI & Machine Learning';
  } else if (query.includes('orm') || query.includes('sql') || query.includes('database')) {
    detectedIntent = 'Database & Query Builder discovery';
    inferredCategory = 'Databases';
  }

  // 1. Filter
  const filtered = repositories.filter((repo) => {
    // Category filter
    if (filters.category && filters.category !== 'All') {
      if (repo.purpose?.technicalCategory !== filters.category) return false;
    }

    // Language filter
    if (filters.language && filters.language !== 'All') {
      if ((repo.primaryLanguage || '').toLowerCase() !== filters.language.toLowerCase()) {
        return false;
      }
    }

    // Framework filter
    if (filters.framework && filters.framework !== 'All') {
      const frameworks = (repo.stackEvidence?.frameworks || []).map((f) => f.toLowerCase());
      if (!frameworks.includes(filters.framework.toLowerCase())) {
        return false;
      }
    }

    // License filter
    if (filters.license && filters.license !== 'All') {
      const spdx = repo.license?.spdxId?.toLowerCase() || '';
      if (spdx !== filters.license.toLowerCase()) {
        return false;
      }
    }

    // Min stars
    if (filters.minStars && repo.stars < filters.minStars) {
      return false;
    }

    // Min readiness score
    if (filters.minReadinessScore && (repo.agentReadiness?.score || 0) < filters.minReadinessScore) {
      return false;
    }

    // Updated within days
    if (filters.updatedWithinDays) {
      const pushDate = new Date(repo.pushedAt).getTime();
      const cutoff = Date.now() - filters.updatedWithinDays * 24 * 60 * 60 * 1000;
      if (pushDate < cutoff) {
        return false;
      }
    }

    // Query text match (if query exists)
    if (queryTokens.length > 0) {
      const searchableText = `${repo.fullName} ${repo.name} ${repo.description} ${(repo.topics || []).join(' ')} ${repo.purpose?.functionalPurpose || ''} ${repo.purpose?.technicalCategory || ''} ${(repo.stackEvidence?.frameworks || []).join(' ')} ${(repo.stackEvidence?.keyDependencies || []).join(' ')}`.toLowerCase();

      // All tokens must match or at least 1 must match with high relevance
      const matchesAny = queryTokens.some((token) => searchableText.includes(token));
      if (!matchesAny) return false;
    }

    return true;
  });

  // 2. Score and Rank
  // Multi-signal scoring prevents single-metric (stars) domination
  const scored = filtered.map((repo) => {
    let score = 0;

    // A. Query relevance (0 - 40 pts)
    if (queryTokens.length > 0) {
      const name = repo.name.toLowerCase();
      const desc = (repo.description || '').toLowerCase();
      const topics = (repo.topics || []).map((t) => t.toLowerCase());

      for (const token of queryTokens) {
        if (name === token) score += 20;
        else if (name.includes(token)) score += 10;

        if (topics.includes(token)) score += 8;
        if (desc.includes(token)) score += 5;
      }
    } else {
      score += 20; // Default baseline relevance
    }

    // B. Category fit (0 - 15 pts)
    if (inferredCategory && repo.purpose?.technicalCategory === inferredCategory) {
      score += 15;
    }

    // C. Compatibility evidence (0 - 20 pts)
    if (filters.userStack) {
      const compat = evaluateCompatibility(repo, filters.userStack);
      if (compat.status === 'confirmed_match') score += 20;
      else if (compat.status === 'potential_match') score += 10;
      else if (compat.status === 'conflict') score -= 15;
    }

    // D. Documentation & Agent Readiness (0 - 15 pts)
    const readiness = repo.agentReadiness?.score || 50;
    score += (readiness / 100) * 15;

    // E. Freshness (0 - 10 pts)
    const daysSincePush = Math.max(0, (Date.now() - new Date(repo.pushedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSincePush < 30) score += 10;
    else if (daysSincePush < 90) score += 6;
    else if (daysSincePush < 365) score += 3;

    // F. Star count log-scale (0 - 10 pts) — preventing star-count from dominating!
    const starSignal = Math.min(10, Math.log10(Math.max(10, repo.stars)) * 2);
    score += starSignal;

    return { repo, score };
  });

  // 3. Sort
  const sortBy = filters.sortBy || 'relevance';
  const sortOrder = filters.sortOrder || 'desc';
  const direction = sortOrder === 'desc' ? -1 : 1;

  scored.sort((a, b) => {
    if (sortBy === 'relevance') {
      return (b.score - a.score) * (sortOrder === 'desc' ? 1 : -1);
    }
    if (sortBy === 'stars') {
      return (b.repo.stars - a.repo.stars) * direction;
    }
    if (sortBy === 'freshness') {
      return (new Date(b.repo.pushedAt).getTime() - new Date(a.repo.pushedAt).getTime()) * direction;
    }
    if (sortBy === 'readiness') {
      return ((b.repo.agentReadiness?.score || 0) - (a.repo.agentReadiness?.score || 0)) * direction;
    }
    return 0;
  });

  const results = scored.map((item) => item.repo);

  // 4. Compute Facets from filtered pool
  const facets: SearchFacets = {
    categories: {},
    languages: {},
    frameworks: {},
    licenses: {},
  };

  for (const r of repositories) {
    // Categories
    const cat = r.purpose?.technicalCategory || 'Other / Unclassified';
    facets.categories[cat] = (facets.categories[cat] || 0) + 1;

    // Languages
    if (r.primaryLanguage) {
      facets.languages[r.primaryLanguage] = (facets.languages[r.primaryLanguage] || 0) + 1;
    }

    // Frameworks
    for (const f of r.stackEvidence?.frameworks || []) {
      facets.frameworks[f] = (facets.frameworks[f] || 0) + 1;
    }

    // Licenses
    if (r.license?.spdxId) {
      facets.licenses[r.license.spdxId] = (facets.licenses[r.license.spdxId] || 0) + 1;
    }
  }

  // 5. Pagination
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 12));
  const total = results.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = results.slice((page - 1) * limit, page * limit);

  return {
    results: paginated,
    total,
    page,
    totalPages,
    facets,
    queryInterpretation: {
      detectedIntent,
      inferredCategory,
      extractedKeywords: queryTokens,
      compatibilityTarget: filters.userStack,
    },
  };
}
