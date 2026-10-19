import { TechnicalCategory } from '../types/index.ts';

export interface CategoryInfo {
  id: TechnicalCategory;
  name: string;
  description: string;
  iconName: string;
  subcategories: string[];
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'Design & UI',
    name: 'Design & UI',
    description: 'Component libraries, design systems, icons, animation primitives, and accessible headless hooks.',
    iconName: 'Palette',
    subcategories: ['Component Libraries', 'Design Systems', 'Iconography', 'Motion & Animation', 'Accessibility Primitives', 'Templates'],
  },
  {
    id: 'Frontend Engineering',
    name: 'Frontend Engineering',
    description: 'Application frameworks, state management, client routing, build toolchains, and form validation.',
    iconName: 'Layout',
    subcategories: ['Application Frameworks', 'State Management', 'Build Tooling', 'Data Validation & Forms', 'Client Routing'],
  },
  {
    id: 'Video & Multimedia',
    name: 'Video & Multimedia',
    description: 'Programmatic video rendering, canvas editors, WebCodecs, FFmpeg pipelines, and audio engineering.',
    iconName: 'Video',
    subcategories: ['Editing & Timelines', 'Transcoding & Processing', 'Streaming & WebRTC', 'Audio Engineering', 'Player Controls'],
  },
  {
    id: 'AI & Machine Learning',
    name: 'AI & Machine Learning',
    description: 'Autonomous coding agents, LLM orchestration, RAG pipelines, vector embeddings, and local inference.',
    iconName: 'Cpu',
    subcategories: ['Autonomous Agents', 'RAG & Vector Search', 'Local & Cloud Inference', 'Model Training & Tuning', 'Prompt Infrastructure'],
  },
  {
    id: 'Backend Engineering',
    name: 'Backend Engineering',
    description: 'HTTP microservices, REST/GraphQL APIs, RPC protocols, background job workers, and concurrency.',
    iconName: 'Server',
    subcategories: ['Web Services & Frameworks', 'Background Jobs & Queues', 'RPC & Protocol Interfaces', 'Authentication & Authz'],
  },
  {
    id: 'Databases',
    name: 'Databases',
    description: 'Type-safe ORMs, SQL query builders, relational engines, embedded vector stores, and analytics.',
    iconName: 'Database',
    subcategories: ['ORMs & Query Builders', 'Relational Systems', 'Vector Databases', 'Embedded Data Engines', 'Columnar Analytics'],
  },
  {
    id: 'DevOps & Infrastructure',
    name: 'DevOps & Infrastructure',
    description: 'Container orchestration, self-hosting platforms, reverse proxies, CI/CD runners, and telemetry.',
    iconName: 'Cloud',
    subcategories: ['Containers & Virtualization', 'Platform & Deployment', 'Observability & Metrics', 'Reverse Proxies & Gateways'],
  },
  {
    id: 'Developer Productivity',
    name: 'Developer Productivity',
    description: 'Fast linters, formatters, monorepo orchestration tools, package managers, and terminal utilities.',
    iconName: 'Terminal',
    subcategories: ['Code Quality & Toolchains', 'Monorepo Tooling', 'Command Line Utilities', 'Package Managers'],
  },
  {
    id: 'Testing',
    name: 'Testing',
    description: 'Browser automation, unit test runners, mocking frameworks, and end-to-end integration suites.',
    iconName: 'CheckCircle2',
    subcategories: ['Unit & E2E Testing', 'Browser Automation', 'Visual Regression', 'Mocking & Fixtures'],
  },
];
