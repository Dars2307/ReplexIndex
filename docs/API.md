# Nexora REST API Documentation (API.md)

Base URL: `http://localhost:3000/api/v1`

## Endpoints Summary

### 1. Search Repositories
`GET /api/v1/search`
Query Parameters:
- `q` (string): Natural language search query or keywords
- `category` (string, optional): Domain category
- `language` (string, optional): Programming language
- `framework` (string, optional): Framework filter
- `license` (string, optional): SPDX license identifier
- `minStars` (number, optional): Minimum stars filter
- `userStack` (string, optional): Target stack for compatibility evaluation
- `sortBy` (string, optional): `relevance` | `stars` | `freshness` | `readiness`
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Limit per page (default: 12)

Example Request:
```bash
curl -X GET "http://localhost:3000/api/v1/search?q=video&userStack=React%20%2B%20TypeScript"
```

### 2. Get Repository Intelligence
`GET /api/v1/repositories/:owner/:repo`
Returns complete repository metadata, purpose classification, and agent readiness.

### 3. Evaluate Compatibility
`GET /api/v1/repositories/:owner/:repo/compatibility?stack=Next.js%20%2B%20TypeScript%20%2B%20Tailwind`
Returns compatibility status (`confirmed_match`, `potential_match`, `conflict`, `unknown`), supporting evidence, and caveats.

### 4. Side-by-Side Comparison
`POST /api/v1/compare`
Payload:
```json
{
  "ids": ["remotion-dev/remotion", "ffmpegwasm/ffmpeg.wasm"],
  "targetStack": "React + TypeScript"
}
```

### 5. Ingest GitHub Repository On-Demand
`POST /api/v1/ingest`
Payload:
```json
{
  "repoQuery": "tailwindlabs/tailwindcss"
}
```

### 6. System Status & Telemetry
`GET /api/v1/system/status`
Returns service uptime, total indexed count, classification coverage rate, and GitHub API rate-limit remaining.
