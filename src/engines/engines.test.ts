import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyRepository } from './classification.ts';
import { evaluateCompatibility } from './compatibility.ts';
import { evaluateAgentReadiness } from './readiness.ts';
import { searchRepositories } from './search.ts';
import { executeMcpTool } from './mcp.ts';
import type { Repository } from '../types/index.ts';

// Test Fixtures
const sampleVideoRepo: Repository = {
  id: 'remotion-dev/remotion',
  name: 'remotion',
  fullName: 'remotion-dev/remotion',
  owner: {
    login: 'remotion-dev',
    avatarUrl: 'https://avatars.githubusercontent.com/u/74384931?v=4',
    htmlUrl: 'https://github.com/remotion-dev',
  },
  htmlUrl: 'https://github.com/remotion-dev/remotion',
  description: 'Make videos programmatically with React.',
  homepageUrl: 'https://remotion.dev',
  primaryLanguage: 'TypeScript',
  languages: ['TypeScript', 'JavaScript'],
  topics: ['video', 'react', 'ffmpeg', 'animation', 'rendering'],
  stars: 21500,
  forks: 1200,
  openIssues: 45,
  license: { key: 'custom', name: 'Remotion Commercial License / Open Source', spdxId: 'MIT' },
  isArchived: false,
  isTemplate: false,
  visibility: 'public',
  sourceProvider: 'github',
  createdAt: '2020-11-20T10:00:00Z',
  pushedAt: '2026-03-15T12:00:00Z',
  lastUpstreamUpdate: '2026-03-15T12:00:00Z',
  discoveredAt: '2026-03-16T00:00:00Z',
  lastIndexedAt: '2026-03-16T00:00:00Z',
  lastClassifiedAt: '2026-03-16T00:00:00Z',
  purpose: {
    technicalCategory: 'Video & Multimedia',
    subcategories: ['Editing & Timelines', 'Motion & Animation'],
    functionalPurpose: 'Make videos programmatically using React and web technologies.',
    intendedAudience: 'Frontend developers and media engineers',
    supportedEnvironments: ['Browser', 'Node.js'],
    implementationApproach: 'Declarative React canvas and WebCodecs/FFmpeg rendering',
    likelyUsageScenarios: ['Programmatic video generation', 'Dynamic motion graphics'],
    maturitySignals: {
      status: 'stable',
      releaseCadence: 'Weekly',
      hasAutomatedTests: true,
      hasTypeDefinitions: true,
    },
    evidenceConfidence: 0.95,
    evidenceNotes: ['Direct video and React match'],
  },
  agentReadiness: {
    score: 92,
    confidence: 'high',
    checklist: {
      licenseClarity: { score: 20, label: 'MIT', verified: true },
      documentationAvailability: { score: 25, label: 'Verified', verified: true },
      packageOrIntegrationInstructions: { score: 20, label: 'npm i remotion', verified: true },
      typeDefinitions: { score: 15, label: 'TypeScript', verified: true },
      maintenanceSignals: { score: 10, label: 'Active', verified: true },
      configurationComplexity: { score: 10, label: 'Standard', verified: true },
    },
    summary: 'High agent readiness',
  },
  stackEvidence: {
    frameworks: ['React'],
    buildTools: ['Vite', 'Webpack'],
    packageManagers: ['npm', 'pnpm'],
    runtimes: ['Node.js'],
    keyDependencies: ['react', 'react-dom'],
    configFileDetected: ['remotion.config.ts', 'package.json'],
  },
  relationships: [
    {
      targetId: 'shotstack/shotstack-sdk',
      targetName: 'shotstack',
      relationshipType: 'alternative_implementation',
      evidence: 'Alternative programmatic cloud video rendering SDK',
      confidence: 0.88,
    },
  ],
  readmeExtract: '# Remotion\n\nCreate videos programmatically in React.\n\n```bash\nnpm install remotion\n```\n',
  installCommand: 'npm install remotion',
};

const sampleUIRepo: Repository = {
  id: 'lucide-icons/lucide',
  name: 'lucide',
  fullName: 'lucide-icons/lucide',
  owner: {
    login: 'lucide-icons',
    avatarUrl: 'https://avatars.githubusercontent.com/u/84232356?v=4',
    htmlUrl: 'https://github.com/lucide-icons',
  },
  htmlUrl: 'https://github.com/lucide-icons/lucide',
  description: 'Beautiful & consistent icon toolkit made by the community. Fork of Feather Icons.',
  homepageUrl: 'https://lucide.dev',
  primaryLanguage: 'TypeScript',
  languages: ['TypeScript', 'JavaScript'],
  topics: ['icons', 'svg', 'ui', 'components', 'react', 'vue'],
  stars: 18400,
  forks: 820,
  openIssues: 30,
  license: { key: 'isc', name: 'ISC License', spdxId: 'ISC' },
  isArchived: false,
  isTemplate: false,
  visibility: 'public',
  sourceProvider: 'github',
  createdAt: '2021-04-10T12:00:00Z',
  pushedAt: '2026-03-20T10:00:00Z',
  lastUpstreamUpdate: '2026-03-20T10:00:00Z',
  discoveredAt: '2026-03-20T12:00:00Z',
  lastIndexedAt: '2026-03-20T12:00:00Z',
  lastClassifiedAt: '2026-03-20T12:00:00Z',
  purpose: {
    technicalCategory: 'Design & UI',
    subcategories: ['Iconography', 'Component Libraries'],
    functionalPurpose: 'Community-crafted icon library with framework adapters.',
    intendedAudience: 'Frontend developers and designers',
    supportedEnvironments: ['Browser', 'Node.js'],
    implementationApproach: 'Clean tree-shakeable SVG components',
    likelyUsageScenarios: ['Web and mobile UI iconography'],
    maturitySignals: {
      status: 'stable',
      releaseCadence: 'Daily',
      hasAutomatedTests: true,
      hasTypeDefinitions: true,
    },
    evidenceConfidence: 0.98,
    evidenceNotes: ['Verified icon toolkit'],
  },
  agentReadiness: {
    score: 95,
    confidence: 'high',
    checklist: {
      licenseClarity: { score: 20, label: 'ISC', verified: true },
      documentationAvailability: { score: 25, label: 'Verified', verified: true },
      packageOrIntegrationInstructions: { score: 20, label: 'npm i lucide-react', verified: true },
      typeDefinitions: { score: 15, label: 'TypeScript', verified: true },
      maintenanceSignals: { score: 10, label: 'Active', verified: true },
      configurationComplexity: { score: 10, label: 'Standard', verified: true },
    },
    summary: 'High agent readiness',
  },
  stackEvidence: {
    frameworks: ['React', 'Vue', 'Svelte'],
    buildTools: ['Vite', 'Rollup'],
    packageManagers: ['pnpm'],
    runtimes: ['Browser', 'Node.js'],
    keyDependencies: [],
    configFileDetected: ['package.json'],
  },
  relationships: [],
  readmeExtract: '# Lucide\n\nBeautiful & consistent icons.\n\n```bash\nnpm install lucide-react\n```\n',
  installCommand: 'npm install lucide-react',
};

// 1. Classification Engine Tests
test('classification engine: classifies video/multimedia correctly', () => {
  const result = classifyRepository({
    name: 'video-render-engine',
    description: 'High performance video timeline editor with ffmpeg transcoding',
    topics: ['video', 'ffmpeg', 'transcoding'],
    primaryLanguage: 'TypeScript',
  });
  assert.equal(result.technicalCategory, 'Video & Multimedia');
  assert.ok(result.subcategories.includes('Editing & Timelines'));
  assert.ok(result.subcategories.includes('Transcoding & Processing'));
  assert.ok(result.evidenceConfidence > 0.8);
});

test('classification engine: classifies UI component library correctly', () => {
  const result = classifyRepository({
    name: 'fluid-primitives',
    description: 'Headless accessible UI components and design system primitives',
    topics: ['ui', 'components', 'design-system', 'accessibility'],
    primaryLanguage: 'TypeScript',
  });
  assert.equal(result.technicalCategory, 'Design & UI');
  assert.ok(result.subcategories.includes('Component Libraries'));
  assert.ok(result.subcategories.includes('Accessibility Primitives'));
});

// 2. Compatibility Engine Tests
test('compatibility engine: confirms match with React + TypeScript target stack', () => {
  const result = evaluateCompatibility(sampleVideoRepo, 'React + TypeScript');
  assert.equal(result.status, 'confirmed_match');
  assert.equal(result.potentialIntegrationComplexity, 'low');
  assert.ok(result.supportingEvidence.length >= 2);
});

test('compatibility engine: identifies conflict when environment mismatched', () => {
  const result = evaluateCompatibility(sampleVideoRepo, 'Python + FastAPI');
  assert.equal(result.status, 'conflict');
  assert.equal(result.potentialIntegrationComplexity, 'high');
  assert.ok(result.dependencyConflicts.length > 0);
});

test('compatibility engine: returns unknown when evidence is insufficient or stack blank', () => {
  const result = evaluateCompatibility(sampleVideoRepo, '');
  assert.equal(result.status, 'unknown');
  assert.equal(result.potentialIntegrationComplexity, 'unknown');
});

// 3. Search & Ranking Tests
test('search engine: matches keyword and ranks accurately', () => {
  const response = searchRepositories([sampleVideoRepo, sampleUIRepo], {
    query: 'video',
  });
  assert.equal(response.total, 1);
  assert.equal(response.results[0].id, 'remotion-dev/remotion');
  assert.equal(response.queryInterpretation?.inferredCategory, 'Video & Multimedia');
});

test('search engine: filters by category and computes accurate facets', () => {
  const response = searchRepositories([sampleVideoRepo, sampleUIRepo], {
    query: '',
    category: 'Design & UI',
  });
  assert.equal(response.total, 1);
  assert.equal(response.results[0].id, 'lucide-icons/lucide');
  assert.equal(response.facets.categories['Video & Multimedia'], 1);
  assert.equal(response.facets.categories['Design & UI'], 1);
});

// 4. MCP Engine Tests
test('mcp engine: executes search_repositories tool', async () => {
  const result = (await executeMcpTool(
    'search_repositories',
    { query: 'icon' },
    [sampleVideoRepo, sampleUIRepo]
  )) as any;
  assert.ok(result.repositories);
  assert.equal(result.count, 1);
  assert.equal(result.repositories[0].name, 'lucide');
});

test('mcp engine: executes compare_repositories tool', async () => {
  const result = (await executeMcpTool(
    'compare_repositories',
    { ids: ['remotion-dev/remotion', 'lucide-icons/lucide'], targetStack: 'React + TypeScript' },
    [sampleVideoRepo, sampleUIRepo]
  )) as any;
  assert.equal(result.comparisonCount, 2);
  assert.equal(result.comparison[0].compatibility?.status, 'confirmed_match');
});

test('mcp engine: executes explain_repository tool', async () => {
  const result = (await executeMcpTool(
    'explain_repository',
    { id: 'remotion-dev/remotion' },
    [sampleVideoRepo, sampleUIRepo]
  )) as any;
  assert.equal(result.name, 'remotion');
  assert.ok(result.summary);
  assert.ok(result.agentReadiness);
});
