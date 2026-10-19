# Nexora — Discover. Understand. Connect.

Agent-native software discovery and contextual intelligence infrastructure.

---

## What is Nexora?
Nexora is a software discovery platform that indexes public software repositories, analyzes their operational purposes, evaluates compatibility against developer environments, and exposes this intelligence to both human developers and autonomous AI agents.

## Key Capabilities
- **Purpose Intelligence Engine:** Classifies tools into technical domains, functional purposes, supported runtimes, and implementation approaches.
- **Compatibility Intelligence Engine:** Evaluates repository manifests against target environments (e.g. Next.js + TypeScript + Tailwind) with transparent evidence and conflict warnings.
- **Agent Readiness Index:** Verifiable 0–100 score breaking down licensing, documentation completeness, static typing, and configuration complexity.
- **Side-by-Side Compare Workspace:** Direct matrix comparison of 2 to 4 tools with markdown export.
- **Visual Spatial Graph:** Interactive SVG relationship graph mapping alternatives, ecosystems, and complementary tools.
- **Model Context Protocol (MCP) Server:** Native JSON-RPC 2.0 endpoint at `/api/v1/mcp` for Claude, Cursor, and autonomous agent integration.
- **Live GitHub Ingestion:** Ingest any public GitHub repository on demand via official APIs.
- **Progressive Web App (PWA):** Installable standalone app with offline support and iOS Safari guidance.

---

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests
node --test src/engines/engines.test.ts

# 3. Start development server (Full-stack Express + Vite on port 3000)
npm run dev

# 4. Build for production
npm run build
npm start
```

---

## MCP Server Configuration
To connect external AI coding agents, add to your MCP client configuration:
```json
{
  "mcpServers": {
    "nexora": {
      "url": "http://localhost:3000/api/v1/mcp"
    }
  }
}
```

---

## Storage & Database

> **Note:** The application currently uses in-memory storage — all data resets when the server restarts. The `packages/database/schema.ts` file describes the planned persistent schema (PostgreSQL via Drizzle ORM) but is not yet wired up. To enable persistence, install `drizzle-orm` and `pg`, provision a PostgreSQL database, and wire the schema to a database client.

---

## Documentation Index
- [Product Definition](PRODUCT.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Design System & Precision Atlas](docs/DESIGN.md)
- [Component Research & Provenance](docs/COMPONENT_RESEARCH.md)
- [REST API Specification](docs/API.md)
- [Model Context Protocol Guide](docs/MCP.md)
- [Security & Threat Model](docs/SECURITY.md)
- [Operations & Deployment](docs/OPERATIONS.md)
- [Testing & Verification](docs/TESTING.md)
- [Product Roadmap](docs/ROADMAP.md)
