# Nexora Architecture & System Specification

## 1. Architectural Overview
Nexora is architected as an **agent-native software discovery and contextual intelligence platform**. Rather than cloning full codebases, Nexora operates as a precision metadata intelligence engine that indexes public software repositories, analyzes their operational purposes and technical environments, and exposes verified intelligence to both human developers and autonomous AI agents.

```text
External Metadata Sources (GitHub API v3, Package Registries)
                      │
                      ▼
         [Discovery & Ingestion Worker]
         • Rate-limit prober & exponential backoff
         • Canonical URL deduplication
         • Metadata normalization
                      │
                      ▼
    ┌─────────────────┴──────────────────┐
    ▼                                    ▼
[Purpose Intelligence Engine]  [Compatibility Engine]
• Technical Category           • Environment token parsing
• Functional Purpose           • Dependency conflict check
• Intended Audience            • Version compatibility notes
• Supported Runtimes           • Grounded evidence builder
    │                                    │
    └─────────────────┬──────────────────┘
                      ▼
        [Agent Readiness Evaluator]
        • License clarity verification
        • Documentation availability check
        • Native type definition check
        • CLI installation command extraction
                      │
                      ▼
      [Unified Storage & Ranking Layer]
      • PostgreSQL Schema (Drizzle ORM)
      • Multi-signal ranking algorithm
      • Relationship graph generator
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[REST API v1 Gateway]      [Model Context Protocol (MCP)]
• /api/v1/search           • JSON-RPC 2.0 Server
• /api/v1/repositories     • search_repositories
• /api/v1/compare          • get_repository
• /api/v1/compatibility    • compare_repositories
• /api/v1/ingest           • find_compatible_tools
        │                           │
        └─────────────┬─────────────┘
                      ▼
          [Web Application & PWA]
          • Precision Atlas Design System
          • React 19 + TypeScript + Vite
          • Offline shell with Service Worker
```

## 2. Core Subsystems

### Engine A — Discovery & Ingestion
- Ingests public repositories via official GitHub API v3 endpoints (`/repos/{owner}/{repo}`) and README manifests.
- Tracks discrete timestamps separately: `upstreamCreatedAt`, `upstreamPushedAt`, `upstreamUpdatedAt`, `lastNexoraFetchAt`, and `lastNexoraClassifiedAt`.
- Enforces strict rate-limit budgets using `x-ratelimit-remaining` and exponential recovery checkpoints.

### Engine B — Purpose Intelligence
- Multi-label classification system mapping repositories to top-level domains: Design & UI, Frontend Engineering, Backend Engineering, Video & Multimedia, AI & Machine Learning, Databases, DevOps & Infrastructure, Developer Productivity, and Testing.
- Distinguishes implementation approach (e.g. headless unstyled primitives, declarative canvas, native Rust binary) from functional purpose.

### Engine C — Compatibility Intelligence
- Evaluates repository manifest evidence against the caller's target environment (e.g., `Next.js + TypeScript + Tailwind`).
- Emits deterministic status signals: `confirmed_match`, `potential_match`, `conflict`, or `unknown`.
- Never claims compatibility without supporting peer evidence.

### Engine D — Multi-Signal Search
- Computes relevance using a balanced multi-signal formula preventing single-metric star dominance:
  $$\text{Score} = \text{TextMatch}(40) + \text{CategoryFit}(15) + \text{CompatibilityEvidence}(20) + \text{AgentReadiness}(15) + \text{Freshness}(10) + \text{LogStars}(10)$$

### Engine E — Model Context Protocol (MCP) Server
- Implements official JSON-RPC 2.0 transport at `/api/v1/mcp`.
- Exposes tools to external autonomous agents (`search_repositories`, `get_repository`, `find_similar_repositories`, `compare_repositories`, `find_compatible_tools`, `explain_repository`, `get_repository_relationships`).
