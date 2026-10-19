# Nexora Testing & Verification Guide (TESTING.md)

## 1. Test Suite Architecture
Nexora verifies application logic using Node 22's native test runner (`node:test` and `node:assert/strict`), coupled with Playwright headless browser automation for interactive DOM, responsiveness, and PWA verification.

## 2. Running Unit Tests
```bash
node --test src/engines/engines.test.ts
```

### Verified Scenarios:
1. **Classification Engine:** Validates deterministic multi-label categorization for Video & Multimedia, Design & UI, and AI & Machine Learning.
2. **Compatibility Engine:** Validates confirmed matches, framework conflicts, and unknown evidence handling.
3. **Agent Readiness Evaluator:** Validates transparent checklist score computation.
4. **Search & Ranking:** Validates keyword query relevance, inferred category intent, and multi-signal facet calculation.
5. **MCP Protocol Dispatcher:** Validates `search_repositories`, `compare_repositories`, and `explain_repository` JSON-RPC execution.

## 3. End-to-End & Visual Acceptance Verification
- Desktop Viewport: 1440x900
- Tablet Viewport: 768x1024
- Mobile Viewport: 390x844
- PWA manifest and service worker presence
- In-app install button state reflection
- Dark and Light theme contrast compliance
