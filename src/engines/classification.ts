import type { PurposeIntelligence, TechnicalCategory } from '../types/index.ts';

interface ClassificationInput {
  name: string;
  description: string;
  topics: string[];
  primaryLanguage: string;
  files?: string[];
  readmeText?: string;
  dependencies?: string[];
}

export function classifyRepository(input: ClassificationInput): PurposeIntelligence {
  const text = `${input.name} ${input.description} ${input.topics.join(' ')}`.toLowerCase();
  const topics = input.topics.map((t) => t.toLowerCase());
  const lang = (input.primaryLanguage || '').toLowerCase();
  const evidenceNotes: string[] = [];

  let category: TechnicalCategory = 'Other / Unclassified';
  const subcategories: string[] = [];

  // Deterministic rule hierarchy
  if (
    topics.includes('video') ||
    topics.includes('audio') ||
    topics.includes('ffmpeg') ||
    topics.includes('streaming') ||
    text.includes('video editor') ||
    text.includes('transcoding') ||
    text.includes('motion graphics') ||
    text.includes('screen recording')
  ) {
    category = 'Video & Multimedia';
    if (text.includes('editor') || text.includes('timeline')) subcategories.push('Editing & Timelines');
    if (text.includes('transcode') || text.includes('ffmpeg')) subcategories.push('Transcoding & Processing');
    if (text.includes('streaming') || text.includes('hls') || text.includes('webrtc')) subcategories.push('Streaming & WebRTC');
    if (text.includes('audio') || text.includes('sound')) subcategories.push('Audio Engineering');
    evidenceNotes.push('Matched multimedia/video indicators in topics or description');
  } else if (
    topics.includes('ui') ||
    topics.includes('components') ||
    topics.includes('design-system') ||
    topics.includes('icons') ||
    topics.includes('animation') ||
    topics.includes('tailwind') ||
    text.includes('component library') ||
    text.includes('design system') ||
    text.includes('icon library') ||
    text.includes('primitives')
  ) {
    category = 'Design & UI';
    if (text.includes('component') || topics.includes('components')) subcategories.push('Component Libraries');
    if (text.includes('design system') || topics.includes('design-system')) subcategories.push('Design Systems');
    if (text.includes('icon') || topics.includes('icons')) subcategories.push('Iconography');
    if (text.includes('animation') || text.includes('motion') || topics.includes('motion')) subcategories.push('Motion & Animation');
    if (text.includes('accessible') || text.includes('a11y') || text.includes('radix')) subcategories.push('Accessibility Primitives');
    evidenceNotes.push('Matched UI/component library terms and visual design topics');
  } else if (
    topics.includes('react') ||
    topics.includes('vue') ||
    topics.includes('svelte') ||
    topics.includes('nextjs') ||
    topics.includes('vite') ||
    topics.includes('frontend') ||
    text.includes('frontend framework') ||
    text.includes('state management') ||
    text.includes('client-side')
  ) {
    category = 'Frontend Engineering';
    if (text.includes('framework') || text.includes('full-stack')) subcategories.push('Application Frameworks');
    if (text.includes('state') || text.includes('store') || text.includes('zustand') || text.includes('redux')) subcategories.push('State Management');
    if (text.includes('bundler') || text.includes('build tool') || text.includes('vite')) subcategories.push('Build Tooling');
    if (text.includes('form') || text.includes('validation') || text.includes('zod')) subcategories.push('Data Validation & Forms');
    evidenceNotes.push('Matched frontend application framework/state management signals');
  } else if (
    topics.includes('ai') ||
    topics.includes('llm') ||
    topics.includes('machine-learning') ||
    topics.includes('nlp') ||
    topics.includes('deep-learning') ||
    text.includes('language model') ||
    text.includes('embeddings') ||
    text.includes('agent') ||
    text.includes('rag')
  ) {
    category = 'AI & Machine Learning';
    if (text.includes('agent') || text.includes('autonomous')) subcategories.push('Autonomous Agents');
    if (text.includes('rag') || text.includes('vector') || text.includes('embedding')) subcategories.push('RAG & Vector Search');
    if (text.includes('inference') || text.includes('model runner')) subcategories.push('Local & Cloud Inference');
    if (text.includes('fine-tuning') || text.includes('training')) subcategories.push('Model Training & Tuning');
    evidenceNotes.push('Matched artificial intelligence, agentic workflow, or ML topics');
  } else if (
    topics.includes('database') ||
    topics.includes('sql') ||
    topics.includes('nosql') ||
    topics.includes('orm') ||
    topics.includes('postgres') ||
    text.includes('database') ||
    text.includes('orm') ||
    text.includes('query builder')
  ) {
    category = 'Databases';
    if (text.includes('orm') || text.includes('query builder')) subcategories.push('ORMs & Query Builders');
    if (text.includes('relational') || text.includes('postgres') || text.includes('sql')) subcategories.push('Relational Systems');
    if (text.includes('vector') || text.includes('similarity')) subcategories.push('Vector Databases');
    if (text.includes('embedded') || text.includes('sqlite') || text.includes('duckdb')) subcategories.push('Embedded Data Engines');
    evidenceNotes.push('Matched database, query builder, or ORM patterns');
  } else if (
    topics.includes('docker') ||
    topics.includes('kubernetes') ||
    topics.includes('ci-cd') ||
    topics.includes('devops') ||
    topics.includes('monitoring') ||
    text.includes('infrastructure') ||
    text.includes('deployment') ||
    text.includes('container')
  ) {
    category = 'DevOps & Infrastructure';
    if (text.includes('container') || text.includes('docker')) subcategories.push('Containers & Virtualization');
    if (text.includes('deploy') || text.includes('paas') || text.includes('cloud')) subcategories.push('Platform & Deployment');
    if (text.includes('monitoring') || text.includes('telemetry') || text.includes('observability')) subcategories.push('Observability & Metrics');
    evidenceNotes.push('Matched DevOps, deployment, or containerization tags');
  } else if (
    topics.includes('backend') ||
    topics.includes('api') ||
    topics.includes('microservice') ||
    topics.includes('server') ||
    text.includes('web framework') ||
    text.includes('rest api') ||
    text.includes('graphql')
  ) {
    category = 'Backend Engineering';
    if (text.includes('fastapi') || text.includes('express') || text.includes('framework')) subcategories.push('Web Services & Frameworks');
    if (text.includes('queue') || text.includes('job') || text.includes('worker')) subcategories.push('Background Jobs & Queues');
    if (text.includes('rpc') || text.includes('grpc') || text.includes('trpc')) subcategories.push('RPC & Protocol Interfaces');
    evidenceNotes.push('Matched server-side, web API, and backend framework markers');
  } else if (
    topics.includes('testing') ||
    topics.includes('test-runner') ||
    topics.includes('e2e') ||
    text.includes('testing library') ||
    text.includes('test framework')
  ) {
    category = 'Testing';
    subcategories.push('Unit & E2E Testing');
    evidenceNotes.push('Matched test framework indicators');
  } else if (
    topics.includes('developer-tools') ||
    topics.includes('linter') ||
    topics.includes('cli') ||
    topics.includes('productivity') ||
    text.includes('formatter') ||
    text.includes('monorepo')
  ) {
    category = 'Developer Productivity';
    if (text.includes('linter') || text.includes('formatter')) subcategories.push('Code Quality & Toolchains');
    if (text.includes('monorepo') || text.includes('workspace')) subcategories.push('Monorepo Tooling');
    if (text.includes('cli') || text.includes('terminal')) subcategories.push('Command Line Utilities');
    evidenceNotes.push('Matched developer tools, CLI, or toolchain tags');
  } else {
    category = 'Other / Unclassified';
    subcategories.push('General Software');
    evidenceNotes.push('Insufficient specialized topic markers; classified as general');
  }

  // Derive functional purpose
  let functionalPurpose = input.description || `Software library providing utilities for ${input.name}`;
  if (!functionalPurpose.endsWith('.')) functionalPurpose += '.';

  // Derive intended audience
  let intendedAudience = 'Software engineers and system architects';
  if (category === 'Design & UI') intendedAudience = 'Frontend developers, design systems engineers, and UI designers';
  else if (category === 'Video & Multimedia') intendedAudience = 'Media engineers, creative developers, and video application builders';
  else if (category === 'AI & Machine Learning') intendedAudience = 'AI researchers, agent developers, and machine learning practitioners';
  else if (category === 'DevOps & Infrastructure') intendedAudience = 'DevOps engineers, SREs, and cloud infrastructure specialists';
  else if (category === 'Databases') intendedAudience = 'Database administrators, backend architects, and data engineers';

  // Supported environments
  const supportedEnvironments: string[] = [];
  if (['typescript', 'javascript'].includes(lang) || text.includes('node') || text.includes('react')) {
    supportedEnvironments.push('Browser', 'Node.js');
    if (text.includes('deno')) supportedEnvironments.push('Deno');
    if (text.includes('bun')) supportedEnvironments.push('Bun');
  }
  if (lang === 'python' || text.includes('python')) supportedEnvironments.push('Python 3.9+ runtime', 'Linux/macOS/Windows');
  if (lang === 'rust' || text.includes('rust')) supportedEnvironments.push('Native (Rust toolchain)', 'WebAssembly (WASM)');
  if (lang === 'go' || text.includes('golang')) supportedEnvironments.push('Native Go runtime', 'Containers');
  if (supportedEnvironments.length === 0) supportedEnvironments.push('Cross-platform environment');

  // Implementation approach
  let implementationApproach = 'Modular composable architecture';
  if (text.includes('headless')) implementationApproach = 'Headless unstyled accessible primitives with full style customizability';
  else if (text.includes('zero-runtime')) implementationApproach = 'Zero-runtime ahead-of-time compiled architecture';
  else if (text.includes('canvas') || text.includes('webgl')) implementationApproach = 'Hardware-accelerated canvas/WebGL rendering pipeline';
  else if (text.includes('declarative')) implementationApproach = 'Declarative state-driven reactive model';
  else if (text.includes('compiler') || text.includes('rust')) implementationApproach = 'High-performance compiled native binary core';

  // Usage scenarios
  const likelyUsageScenarios: string[] = [
    `Building production web applications requiring ${input.name}`,
    `Integrating into modern ${lang || 'full-stack'} toolchains`,
  ];
  if (category === 'Design & UI') {
    likelyUsageScenarios.push('Crafting cohesive, accessible design systems', 'Rapid prototyping of interactive user interfaces');
  } else if (category === 'Video & Multimedia') {
    likelyUsageScenarios.push('Programmatic video generation and web-based rendering', 'Building client-side media manipulation tools');
  } else if (category === 'AI & Machine Learning') {
    likelyUsageScenarios.push('Deploying agentic retrieval pipelines', 'Integrating LLM workflows into existing backend services');
  }

  return {
    technicalCategory: category,
    subcategories: subcategories.length > 0 ? subcategories : ['General'],
    functionalPurpose,
    intendedAudience,
    supportedEnvironments,
    implementationApproach,
    likelyUsageScenarios,
    maturitySignals: {
      status: 'stable',
      releaseCadence: 'Regular active updates',
      hasAutomatedTests: true,
      hasTypeDefinitions: ['typescript', 'rust', 'go'].includes(lang) || text.includes('typescript'),
    },
    evidenceConfidence: category !== 'Other / Unclassified' ? 0.92 : 0.45,
    evidenceNotes,
  };
}
