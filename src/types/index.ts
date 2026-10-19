/**
 * Nexora Core Data Contracts & Domain Types
 * Adheres to Section 2 (Product Scope), Section 3 (Differentiation), and Section 9 (Data Model)
 */

export type TechnicalCategory =
  | 'Design & UI'
  | 'Frontend Engineering'
  | 'Backend Engineering'
  | 'Mobile Development'
  | 'AI & Machine Learning'
  | 'Data & Analytics'
  | 'Security'
  | 'DevOps & Infrastructure'
  | 'Video & Multimedia'
  | 'Gaming'
  | 'Developer Productivity'
  | 'Documentation & Education'
  | 'Automation'
  | 'Testing'
  | 'Databases'
  | 'Other / Unclassified';

export interface PurposeIntelligence {
  technicalCategory: TechnicalCategory;
  subcategories: string[];
  functionalPurpose: string;
  intendedAudience: string;
  supportedEnvironments: string[];
  implementationApproach: string;
  likelyUsageScenarios: string[];
  maturitySignals: {
    status: 'stable' | 'active_development' | 'experimental' | 'archived';
    releaseCadence: string;
    hasAutomatedTests: boolean;
    hasTypeDefinitions: boolean;
  };
  evidenceConfidence: number; // 0.0 to 1.0
  evidenceNotes: string[];
}

export type CompatibilityStatus = 'confirmed_match' | 'potential_match' | 'conflict' | 'unknown';

export interface CompatibilityEvidence {
  status: CompatibilityStatus;
  targetStack: string; // e.g. "Next.js + TypeScript + Tailwind"
  supportingEvidence: string[];
  missingEvidence: string[];
  potentialIntegrationComplexity: 'low' | 'moderate' | 'high' | 'unknown';
  dependencyConflicts: string[];
  versionCompatibility: string;
  sourceLinks: string[];
  summary: string;
}

export interface AgentReadiness {
  score: number; // 0 to 100
  confidence: 'high' | 'medium' | 'low';
  checklist: {
    licenseClarity: { score: number; label: string; verified: boolean };
    documentationAvailability: { score: number; label: string; verified: boolean };
    packageOrIntegrationInstructions: { score: number; label: string; verified: boolean };
    typeDefinitions: { score: number; label: string; verified: boolean };
    maintenanceSignals: { score: number; label: string; verified: boolean };
    configurationComplexity: { score: number; label: string; verified: boolean };
  };
  summary: string;
}

export interface RepositoryRelationship {
  targetId: string;
  targetName: string;
  relationshipType:
    | 'similar_purpose'
    | 'same_ecosystem'
    | 'alternative_implementation'
    | 'complementary_tool'
    | 'shared_topics'
    | 'dependency';
  evidence: string;
  confidence: number;
}

export interface Repository {
  id: string; // "owner/repo"
  name: string;
  fullName: string;
  owner: {
    login: string;
    avatarUrl: string;
    htmlUrl: string;
  };
  htmlUrl: string;
  description: string;
  homepageUrl: string | null;
  primaryLanguage: string;
  languages: string[];
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  license: {
    key: string;
    name: string;
    spdxId: string;
  } | null;
  isArchived: boolean;
  isTemplate: boolean;
  visibility: 'public' | 'private';
  sourceProvider: 'github' | 'registry' | 'manual';
  
  // Timestamps
  createdAt: string;
  pushedAt: string;
  lastUpstreamUpdate: string;
  discoveredAt: string;
  lastIndexedAt: string;
  lastClassifiedAt: string;

  // Intelligence Engines
  purpose: PurposeIntelligence;
  agentReadiness: AgentReadiness;
  stackEvidence: {
    frameworks: string[];
    buildTools: string[];
    packageManagers: string[];
    runtimes: string[];
    keyDependencies: string[];
    configFileDetected: string[];
  };
  relationships: RepositoryRelationship[];

  // Quick previews / README highlights
  readmeExtract?: string;
  readmeUrl?: string;
  installCommand?: string;
}

export interface SearchFilters {
  query: string;
  category?: TechnicalCategory | 'All';
  language?: string;
  framework?: string;
  license?: string;
  minStars?: number;
  updatedWithinDays?: number;
  requiresTypes?: boolean;
  minReadinessScore?: number;
  userStack?: string; // Evaluated dynamically for compatibility
  sortBy?: 'relevance' | 'stars' | 'freshness' | 'readiness';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchFacets {
  categories: { [key: string]: number };
  languages: { [key: string]: number };
  frameworks: { [key: string]: number };
  licenses: { [key: string]: number };
}

export interface SearchResponse {
  results: Repository[];
  total: number;
  page: number;
  totalPages: number;
  facets: SearchFacets;
  queryInterpretation?: {
    detectedIntent: string;
    inferredCategory?: string;
    extractedKeywords: string[];
    compatibilityTarget?: string;
  };
}

export interface CollectionItem {
  repositoryId: string;
  addedAt: string;
  notes: string;
  tags: string[];
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  color?: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  items: CollectionItem[];
}

export interface Watchlist {
  id: string;
  name: string;
  targetType: 'repository' | 'category' | 'ecosystem' | 'saved_search';
  targetValue: string;
  createdAt: string;
  lastCheckedAt: string;
  notificationsCount: number;
}

export interface ActivityNotification {
  id: string;
  watchlistId: string;
  repositoryId: string;
  repositoryName: string;
  type: 'version_release' | 'star_milestone' | 'license_change' | 'recent_push' | 'stack_update';
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  hashedSecret: string;
  createdAt: string;
  lastUsedAt: string | null;
  rateLimitTier: 'free' | 'developer' | 'agent';
  allowedScopes: string[];
}

export interface SystemStatus {
  service: string;
  version: string;
  uptimeSeconds: number;
  indexedRepositoriesCount: number;
  classificationCoverageRate: number;
  averageIngestionDurationMs: number;
  gitHubApiRateLimit: {
    limit: number;
    remaining: number;
    resetAt: string;
  };
  mcpServerStatus: 'active' | 'degraded';
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}
