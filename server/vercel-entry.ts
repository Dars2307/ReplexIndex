import type { IncomingMessage, ServerResponse } from 'node:http';
import { app } from './app.ts';

// Vercel routes every /api/* request to this function. Its request URL is the
// original path; if a platform rewrite ever hands us the bare "/api", recover
// the original path from Vercel's matched-path header.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const original = req.headers['x-vercel-original-path'] ?? req.headers['x-matched-path'];
  if ((req.url === '/api' || req.url?.startsWith('/api?')) && typeof original === 'string' && original.startsWith('/api/')) {
    req.url = original + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  }
  return app(req as never, res as never);
}
