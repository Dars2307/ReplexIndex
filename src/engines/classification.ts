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

interface Rule {
  category: TechnicalCategory;
  topics: string[];
  terms: string[];
  subcategories: [string, string[]][];
  audience: string;
}

// Topics are exact GitHub topic matches (strong signal); terms are whole-word
// matches in name/description (medium) and README (weak).
const RULES: Rule[] = [
  {
    category: 'Security',
    topics: ['security', 'reverse-engineering', 'malware-analysis', 'pentesting', 'penetration-testing', 'ctf', 'exploit', 'vulnerability', 'decompiler', 'disassembler', 'binary-analysis', 'fuzzing', 'osint', 'red-team', 'forensics', 'cryptography'],
    terms: ['reverse engineering', 'decompiler', 'disassembler', 'debugger', 'malware', 'exploit', 'vulnerability', 'pentest', 'penetration testing', 'fuzzer', 'fuzzing', 'osint', 'ctf', 'forensics', 'sandbox escape', 'binary analysis', 'firmware', 'security scanner', 'secrets scanning'],
    subcategories: [
      ['Reverse Engineering', ['reverse', 'decompil', 'disassembl', 'binary', 'firmware', 'ghidra', 'ida']],
      ['Offensive Security', ['exploit', 'pentest', 'red team', 'c2']],
      ['Vulnerability Scanning', ['scanner', 'vulnerability', 'cve', 'sast']],
      ['Malware Analysis', ['malware', 'yara', 'sandbox']],
      ['Fuzzing', ['fuzz']],
    ],
    audience: 'Security researchers, reverse engineers and application security teams',
  },
  {
    category: 'AI & Machine Learning',
    topics: ['ai', 'llm', 'llms', 'machine-learning', 'deep-learning', 'nlp', 'ai-agents', 'agents', 'rag', 'transformers', 'generative-ai', 'openai', 'anthropic', 'mcp', 'model-context-protocol', 'computer-vision', 'diffusion', 'pytorch', 'langchain', 'chatgpt', 'claude'],
    terms: ['llm', 'large language model', 'language model', 'ai agent', 'ai agents', 'agentic', 'rag', 'retrieval augmented', 'embeddings', 'inference', 'fine-tuning', 'fine tune', 'transformer', 'diffusion', 'neural network', 'machine learning', 'mcp server', 'model context protocol', 'prompt', 'chatbot', 'speech recognition', 'text-to-speech'],
    subcategories: [
      ['Autonomous Agents', ['agent', 'agentic', 'autonomous']],
      ['RAG & Vector Search', ['rag', 'retrieval', 'vector', 'embedding']],
      ['Inference & Serving', ['inference', 'serving', 'quantiz', 'gguf', 'vllm']],
      ['Training & Fine-tuning', ['training', 'fine-tun', 'lora']],
      ['MCP & Tooling', ['mcp', 'model context protocol', 'tool calling']],
      ['Computer Vision', ['vision', 'image', 'diffusion', 'segmentation']],
    ],
    audience: 'AI engineers, agent developers and ML practitioners',
  },
  {
    category: 'Video & Multimedia',
    topics: ['video', 'audio', 'ffmpeg', 'streaming', 'webrtc', 'media', 'video-editor', 'music'],
    terms: ['video editor', 'video', 'transcoding', 'motion graphics', 'screen recording', 'audio', 'podcast', 'livestream', 'webrtc', 'ffmpeg'],
    subcategories: [
      ['Editing & Timelines', ['editor', 'timeline']],
      ['Transcoding & Processing', ['transcod', 'ffmpeg', 'encode']],
      ['Streaming & WebRTC', ['stream', 'hls', 'webrtc']],
      ['Audio Engineering', ['audio', 'sound', 'music']],
    ],
    audience: 'Media engineers, creative developers and video application builders',
  },
  {
    category: 'Design & UI',
    topics: ['ui', 'components', 'design-system', 'icons', 'animation', 'tailwindcss', 'tailwind', 'shadcn', 'ui-components', 'figma', 'css'],
    terms: ['component library', 'design system', 'icon library', 'icons', 'ui kit', 'primitives', 'animation library', 'tailwind', 'shadcn', 'figma'],
    subcategories: [
      ['Component Libraries', ['component', 'ui kit']],
      ['Design Systems', ['design system', 'tokens']],
      ['Iconography', ['icon']],
      ['Motion & Animation', ['animation', 'motion']],
      ['Accessibility Primitives', ['accessible', 'a11y', 'aria', 'headless']],
    ],
    audience: 'Frontend developers, design-systems engineers and UI designers',
  },
  {
    category: 'Mobile Development',
    topics: ['android', 'ios', 'react-native', 'flutter', 'swift', 'kotlin', 'mobile', 'expo', 'swiftui'],
    terms: ['android', 'ios app', 'react native', 'flutter', 'mobile app', 'swiftui', 'jetpack compose', 'expo'],
    subcategories: [
      ['Cross-platform', ['react native', 'flutter', 'expo']],
      ['Native iOS', ['ios', 'swift']],
      ['Native Android', ['android', 'kotlin']],
    ],
    audience: 'Mobile developers',
  },
  {
    category: 'Gaming',
    topics: ['game', 'game-engine', 'gamedev', 'unity', 'godot', 'emulator', 'minecraft', 'games'],
    terms: ['game engine', 'game', 'emulator', 'gamedev', 'godot', 'unity', 'unreal'],
    subcategories: [
      ['Game Engines', ['engine']],
      ['Emulation', ['emulator', 'emulation']],
    ],
    audience: 'Game developers and emulation enthusiasts',
  },
  {
    category: 'Databases',
    topics: ['database', 'sql', 'nosql', 'orm', 'postgres', 'postgresql', 'sqlite', 'redis', 'vector-database', 'mongodb'],
    terms: ['database', 'orm', 'query builder', 'key-value store', 'postgres', 'sqlite', 'vector database', 'time series'],
    subcategories: [
      ['ORMs & Query Builders', ['orm', 'query builder']],
      ['Relational Systems', ['relational', 'postgres', 'sql']],
      ['Vector Databases', ['vector']],
      ['Embedded Engines', ['embedded', 'sqlite', 'duckdb']],
    ],
    audience: 'Backend architects, database administrators and data engineers',
  },
  {
    category: 'Data & Analytics',
    topics: ['data-science', 'analytics', 'data-visualization', 'etl', 'dataframe', 'jupyter', 'pandas', 'bi'],
    terms: ['analytics', 'data pipeline', 'etl', 'dataframe', 'data visualization', 'dashboard', 'business intelligence', 'web scraping', 'scraper'],
    subcategories: [
      ['Visualization', ['visualiz', 'chart', 'dashboard']],
      ['Pipelines & ETL', ['pipeline', 'etl', 'ingest']],
      ['Scraping', ['scrap', 'crawl']],
    ],
    audience: 'Data engineers, analysts and data scientists',
  },
  {
    category: 'DevOps & Infrastructure',
    topics: ['docker', 'kubernetes', 'ci-cd', 'devops', 'monitoring', 'terraform', 'self-hosted', 'homelab', 'observability', 'infrastructure-as-code'],
    terms: ['infrastructure', 'deployment', 'container', 'kubernetes', 'docker', 'self-hosted', 'observability', 'monitoring', 'ci/cd', 'terraform'],
    subcategories: [
      ['Containers & Orchestration', ['container', 'docker', 'kubernetes']],
      ['Platform & Deployment', ['deploy', 'paas', 'cloud', 'self-hosted']],
      ['Observability', ['monitor', 'telemetry', 'observab', 'logging']],
    ],
    audience: 'DevOps engineers, SREs and platform teams',
  },
  {
    category: 'Backend Engineering',
    topics: ['backend', 'api', 'microservices', 'server', 'graphql', 'rest-api', 'grpc', 'web-framework'],
    terms: ['web framework', 'rest api', 'graphql', 'http server', 'microservice', 'backend', 'rpc'],
    subcategories: [
      ['Web Frameworks', ['framework', 'router']],
      ['Jobs & Queues', ['queue', 'job', 'worker']],
      ['RPC & Protocols', ['rpc', 'grpc', 'trpc', 'graphql']],
    ],
    audience: 'Backend engineers',
  },
  {
    category: 'Frontend Engineering',
    topics: ['react', 'vue', 'svelte', 'nextjs', 'vite', 'frontend', 'javascript-framework', 'solidjs', 'astro'],
    terms: ['frontend framework', 'state management', 'single page', 'react', 'vue', 'svelte', 'static site'],
    subcategories: [
      ['Application Frameworks', ['framework', 'full-stack', 'meta-framework']],
      ['State Management', ['state', 'store']],
      ['Build Tooling', ['bundler', 'build tool']],
      ['Forms & Validation', ['form', 'validation']],
    ],
    audience: 'Frontend engineers',
  },
  {
    category: 'Testing',
    topics: ['testing', 'test-runner', 'e2e', 'unit-testing', 'playwright', 'test-automation'],
    terms: ['testing library', 'test framework', 'test runner', 'end-to-end', 'e2e', 'mocking', 'snapshot testing'],
    subcategories: [['Unit & E2E Testing', ['test']]],
    audience: 'Engineers and QA teams',
  },
  {
    category: 'Automation',
    topics: ['automation', 'workflow', 'bot', 'rpa', 'scheduler', 'no-code', 'low-code'],
    terms: ['automation', 'workflow automation', 'bot', 'browser automation', 'no-code', 'low-code', 'cron'],
    subcategories: [
      ['Workflow Engines', ['workflow']],
      ['Browser Automation', ['browser', 'puppeteer', 'playwright']],
      ['Bots', ['bot']],
    ],
    audience: 'Automation engineers and operations teams',
  },
  {
    category: 'Developer Productivity',
    topics: ['developer-tools', 'cli', 'linter', 'productivity', 'terminal', 'vscode-extension', 'neovim', 'git', 'dotfiles'],
    terms: ['cli', 'command line', 'terminal', 'linter', 'formatter', 'monorepo', 'developer tool', 'editor plugin', 'neovim', 'vscode'],
    subcategories: [
      ['Code Quality', ['lint', 'format']],
      ['Monorepo Tooling', ['monorepo', 'workspace']],
      ['Command Line', ['cli', 'terminal', 'shell']],
      ['Editors & IDEs', ['vscode', 'neovim', 'editor']],
    ],
    audience: 'Software engineers',
  },
  {
    category: 'Documentation & Education',
    topics: ['awesome', 'awesome-list', 'tutorial', 'education', 'learning', 'interview', 'roadmap', 'books', 'course'],
    terms: ['awesome list', 'curated list', 'tutorial', 'course', 'learn', 'roadmap', 'cheatsheet', 'interview', 'documentation'],
    subcategories: [
      ['Curated Lists', ['awesome', 'curated']],
      ['Learning Resources', ['tutorial', 'course', 'learn', 'book']],
    ],
    audience: 'Learners and engineers researching a topic',
  },
];

function wordRegex(term: string): RegExp {
  return new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`);
}
const compiled = RULES.map((rule) => ({ rule, terms: rule.terms.map((t) => [t, wordRegex(t)] as const) }));

export function classifyRepository(input: ClassificationInput): PurposeIntelligence {
  const primary = `${input.name.replace(/[-_]/g, ' ')} ${input.description}`.toLowerCase();
  const readme = (input.readmeText || '').slice(0, 4000).toLowerCase();
  const topics = input.topics.map((t) => t.toLowerCase());
  const lang = (input.primaryLanguage || '').toLowerCase();

  let best: { rule: Rule; score: number; evidence: string[] } | null = null;
  for (const { rule, terms } of compiled) {
    let score = 0;
    const evidence: string[] = [];
    for (const topic of topics) {
      if (rule.topics.includes(topic)) {
        score += 3;
        evidence.push(`topic "${topic}"`);
      }
    }
    for (const [term, re] of terms) {
      if (re.test(primary)) {
        score += 2;
        evidence.push(`"${term}" in description`);
      } else if (readme && re.test(readme)) {
        score += 0.5;
      }
    }
    if (score > (best?.score ?? 0)) best = { rule, score, evidence };
  }

  const matched = best && best.score >= 2 ? best : null;
  const category: TechnicalCategory = matched?.rule.category ?? 'Other / Unclassified';
  const haystack = `${primary} ${topics.join(' ')}`;
  const subcategories = matched
    ? matched.rule.subcategories.filter(([, keys]) => keys.some((k) => haystack.includes(k))).map(([label]) => label)
    : [];

  let functionalPurpose = input.description.trim() || `Open-source project ${input.name}`;
  if (!/[.!?]$/.test(functionalPurpose)) functionalPurpose += '.';

  const supportedEnvironments: string[] = [];
  if (['typescript', 'javascript'].includes(lang)) supportedEnvironments.push('Node.js', 'Browser');
  if (lang === 'python') supportedEnvironments.push('Python 3');
  if (lang === 'rust') supportedEnvironments.push('Native (Rust)');
  if (lang === 'go') supportedEnvironments.push('Native (Go)');
  if (['c', 'c++'].includes(lang)) supportedEnvironments.push('Native (C/C++)');
  if (['swift', 'kotlin', 'dart'].includes(lang)) supportedEnvironments.push('Mobile');
  if (/\bwasm\b|webassembly/.test(haystack)) supportedEnvironments.push('WebAssembly');
  if (/\bdocker\b/.test(haystack + readme)) supportedEnvironments.push('Docker');
  if (supportedEnvironments.length === 0) supportedEnvironments.push('Cross-platform');

  let implementationApproach = 'Modular library';
  if (/\bheadless\b/.test(haystack)) implementationApproach = 'Headless, unstyled primitives';
  else if (/\bcli\b|command line|terminal/.test(haystack)) implementationApproach = 'Command-line tool';
  else if (/self-hosted|docker/.test(haystack)) implementationApproach = 'Self-hostable application';
  else if (/\bplugin\b|extension/.test(haystack)) implementationApproach = 'Plugin / extension';
  else if (/framework/.test(haystack)) implementationApproach = 'Framework';
  else if (/\bwasm\b|webassembly|native/.test(haystack)) implementationApproach = 'Compiled native core';

  return {
    technicalCategory: category,
    subcategories: subcategories.length > 0 ? subcategories : ['General'],
    functionalPurpose,
    intendedAudience: matched?.rule.audience ?? 'Software engineers',
    supportedEnvironments,
    implementationApproach,
    likelyUsageScenarios: subcategories.length > 0 ? subcategories.map((s) => `${s} for ${input.name}`) : [`Using ${input.name} in a ${input.primaryLanguage || 'software'} project`],
    // Maturity is refined from GitHub timestamps by the caller.
    maturitySignals: {
      status: 'stable',
      releaseCadence: 'Unknown',
      hasAutomatedTests: /\b(test|tests|ci|coverage)\b/.test(readme),
      hasTypeDefinitions: ['typescript', 'rust', 'go', 'swift', 'kotlin'].includes(lang) || /typescript|typed/.test(haystack),
    },
    evidenceConfidence: matched ? Math.min(0.95, 0.5 + matched.score * 0.06) : 0.3,
    evidenceNotes: matched ? matched.evidence.slice(0, 6) : ['No strong category signals in topics or description'],
  };
}
