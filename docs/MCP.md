# Nexora Model Context Protocol (MCP) Server (MCP.md)

Endpoint: `POST /api/v1/mcp`
Transport: HTTP POST JSON-RPC 2.0 / SSE Compliant

## Supported Tools

### 1. `search_repositories`
Searches indexed tools with purpose intelligence and compatibility scoring.
Input Schema:
```json
{
  "query": "React video editor",
  "category": "Video & Multimedia",
  "userStack": "Next.js + TypeScript",
  "limit": 5
}
```

### 2. `get_repository`
Retrieves full purpose classification and agent readiness for a repository.
Input Schema:
```json
{
  "id": "remotion-dev/remotion"
}
```

### 3. `compare_repositories`
Compares 2 to 4 repositories along purpose, license, tech stack, and compatibility.
Input Schema:
```json
{
  "ids": ["remotion-dev/remotion", "ffmpegwasm/ffmpeg.wasm"],
  "targetStack": "React + TypeScript"
}
```

### 4. `find_compatible_tools`
Returns tools confirmed or potentially compatible with the specified stack.
Input Schema:
```json
{
  "targetStack": "Next.js + Tailwind + TypeScript",
  "limit": 10
}
```

### 5. `explain_repository`
Returns an architectural plain-text explanation of what a tool does and how to install it.
Input Schema:
```json
{
  "id": "lucide-icons/lucide"
}
```

### 6. `get_repository_relationships`
Retrieves discovery graph links (alternatives, complementary tools, dependencies).

---

## Agent Client Configuration

Add this entry to your MCP client configuration (e.g. `claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "nexora": {
      "url": "http://localhost:3000/api/v1/mcp"
    }
  }
}
```
