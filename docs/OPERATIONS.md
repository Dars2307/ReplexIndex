# Nexora Operations & Deployment Guide (OPERATIONS.md)

## 1. Local Development
```bash
# Install dependencies
npm install

# Run full-stack dev server (Express REST + MCP + Vite on port 3000)
npm run dev

# Run unit tests
node --test src/engines/engines.test.ts
```

## 2. Production Build
```bash
# Build Vite client assets into dist/
npm run build

# Start production full-stack server
npm start
```

## 3. Environment Variables
Defined in `.env.example`:
- `PORT`: Server port (default: 3000)
- `GITHUB_TOKEN`: Optional personal access token for higher GitHub API rate limits (5,000 req/hr vs 60 unauthenticated)
- `NODE_ENV`: `development` | `production`

## 4. Health & Monitoring
Check server health at `GET /api/v1/system/status`. Returns uptime, indexed repository counts, classification coverage rate, and remaining rate limits.
