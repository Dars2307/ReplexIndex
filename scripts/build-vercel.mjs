// Produces a Vercel Build Output API v3 bundle in .vercel/output:
//   static/            the Vite SPA (dist/)
//   functions/api.func one Node function wrapping the Express API
//   config.json        routing: /api/* -> function, assets cached, SPA fallback
// https://vercel.com/docs/build-output-api/v3
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.vercel', 'output');
const fn = join(out, 'functions', 'api.func');

if (!existsSync(join(root, 'dist', 'index.html'))) {
  throw new Error('dist/ is missing — run `vite build` first');
}

// Start from an empty output so files from a previous build can't linger.
rmSync(out, { recursive: true, force: true });
mkdirSync(fn, { recursive: true });
cpSync(join(root, 'dist'), join(out, 'static'), { recursive: true });

await build({
  entryPoints: [join(root, 'api', 'index.ts')],
  // .cjs: the repo's package.json is "type": "module", so a CommonJS .js
  // bundle would be misread as ESM.
  outfile: join(fn, 'index.cjs'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: 'linked',
  legalComments: 'none',
  logLevel: 'warning',
});

writeFileSync(
  join(fn, '.vc-config.json'),
  JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.cjs', launcherType: 'Nodejs', shouldAddHelpers: false, maxDuration: 30 }, null, 2),
);

// CSP: allow the inline pre-paint theme script by its exact hash rather than
// 'unsafe-inline'. Inline style attributes are used for dynamic widths/colours.
const html = readFileSync(join(root, 'dist', 'index.html'), 'utf8');
const scriptHashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
  (m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`,
);
const csp = [
  "default-src 'self'",
  `script-src 'self' ${scriptHashes.join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://avatars.githubusercontent.com https://github.com",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = {
  'content-security-policy': csp,
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'strict-transport-security': 'max-age=63072000; includeSubDomains',
};

writeFileSync(
  join(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '/(.*)', headers: securityHeaders, continue: true },
        { src: '/assets/(.*)', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
        { src: '/api(?:/.*)?', dest: '/api' },
        { handle: 'filesystem' },
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
);

console.log('Vercel build output written to .vercel/output');
