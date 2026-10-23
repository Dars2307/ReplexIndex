import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';

// Configure before importing modules that read env at load time. NODE_ENV=test
// stops server/env.ts from loading .env.local, so tests never reach live data.
process.env.NODE_ENV = 'test';
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.GITHUB_TOKEN;
delete process.env.GEMINI_API_KEY;
delete process.env.SUPABASE_URL;
delete process.env.VITE_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { mintApiKey, sha256, encryptSecret, decryptSecret, looksLikeApiKey, safeEqual } = await import('./crypto.ts');
const { buildGithubQuery, demoteUnrelated, isKeywordStuffed, isValidFullName, queryTerms, toRepository } = await import('./github.ts');
const { handleMessage, TOOLS } = await import('./mcp.ts');
const { judgePackage, normalizePackageName } = await import('./packages.ts');
const { classifyRepository } = await import('../src/engines/classification.ts');
const { app } = await import('./app.ts');
const { API_KEY_SCOPES } = await import('./auth.ts');

// An API key caller: agents only ever get read scopes.
const caller = {
  userId: '00000000-0000-0000-0000-000000000001',
  via: 'api_key' as const,
  scopes: ['search:read', 'repositories:read', 'library:read', 'mcp:invoke'],
};

describe('crypto', () => {
  test('API keys have a recognisable prefix and are stored only as a hash', () => {
    const key = mintApiKey();
    assert.match(key.raw, /^rpx_[A-Za-z0-9_-]{43}$/);
    assert.equal(key.prefix, key.raw.slice(0, 12));
    assert.equal(key.hash, sha256(key.raw));
    assert.notEqual(mintApiKey().raw, key.raw);
    assert.ok(looksLikeApiKey(key.raw));
    assert.ok(!looksLikeApiKey('eyJhbGciOi...'));
  });

  test('GitHub tokens round-trip through AES-GCM and tampering is detected', () => {
    const secret = 'gho_exampleTokenValue123';
    const sealed = encryptSecret(secret);
    assert.notEqual(sealed, secret);
    assert.notEqual(encryptSecret(secret), sealed, 'fresh IV per encryption');
    assert.equal(decryptSecret(sealed), secret);
    const bytes = Buffer.from(sealed, 'base64');
    bytes[bytes.length - 1] ^= 0xff;
    assert.throws(() => decryptSecret(bytes.toString('base64')));
  });

  test('safeEqual compares in constant time and handles length mismatch', () => {
    assert.ok(safeEqual('abc', 'abc'));
    assert.ok(!safeEqual('abc', 'abd'));
    assert.ok(!safeEqual('abc', 'abcd'));
  });
});

describe('GitHub query builder', () => {
  test('free text plus safe qualifiers', () => {
    const q = buildGithubQuery({ q: 'decompiler', language: 'Rust', topic: 'Reverse Engineering', minStars: 50 });
    assert.equal(q, 'decompiler language:"Rust" topic:reverse-engineering stars:>=50 archived:false fork:false is:public');
  });

  test('always restricts to public repositories', () => {
    assert.match(buildGithubQuery({ q: 'anything' }), /\bis:public\b/);
    assert.match(buildGithubQuery({ q: '' }), /\bis:public\b/);
  });

  test('rejects qualifier injection through filters', () => {
    const q = buildGithubQuery({ q: 'x', language: 'Rust" org:evil', topic: 'a b:c' });
    assert.ok(!q.includes('org:evil'));
    assert.ok(!q.includes('language:'));
    assert.ok(!q.includes('topic:'));
  });

  test('strips newlines and caps length', () => {
    const q = buildGithubQuery({ q: `a\nb\r\n${'z'.repeat(500)}` });
    assert.ok(!/[\r\n]/.test(q));
    assert.ok(q.length < 260);
  });

  test('empty query falls back to popular repositories', () => {
    assert.match(buildGithubQuery({ q: '' }), /stars:>1000/);
  });

  test('full name validation', () => {
    assert.ok(isValidFullName('vercel/next.js'));
    assert.ok(!isValidFullName('../etc/passwd'));
    assert.ok(!isValidFullName('owner/repo/extra'));
    assert.ok(!isValidFullName('owner'));
  });

  test('keyword-stuffed repositories are recognised by their giant descriptions', () => {
    assert.ok(isKeywordStuffed({ description: '反中共政治宣传库 ui kit dashboard '.repeat(3000) }));
    assert.ok(!isKeywordStuffed({ description: 'React Dashboard made with Material UI components.' }));
    assert.ok(!isKeywordStuffed({ description: null }));
  });

  test('search words skip qualifiers, punctuation and filler words', () => {
    assert.deepEqual(queryTerms('Field service app, UI kit language:TypeScript'), ['field', 'service', 'ui', 'kit']);
  });

  test('results unrelated to the search words move below related ones', () => {
    const repo = (fullName: string, description: string, topics: string[] = []) => ({ fullName, description, topics }) as never;
    const ranked = demoteUnrelated(
      [repo('gege-circle/.github', 'GitHub grassland community'), repo('devias-io/material-kit-react', 'React Dashboard with Material UI'), repo('x/y', 'Admin', ['ui-kit'])],
      'react dashboard ui kit',
    ) as { fullName: string }[];
    assert.deepEqual(ranked.map((r) => r.fullName), ['devias-io/material-kit-react', 'x/y', 'gege-circle/.github']);
  });

  test('install command comes from the README, never guessed from the name', () => {
    const data = {
      name: 'next.js', full_name: 'vercel/next.js', owner: { login: 'vercel', avatar_url: '', html_url: '' }, html_url: 'https://github.com/vercel/next.js',
      language: 'TypeScript', topics: [], stargazers_count: 1, forks_count: 0, open_issues_count: 0, created_at: '2016-10-05T00:00:00Z', pushed_at: '2026-10-22T00:00:00Z',
    };
    assert.equal(toRepository(data, '# Next.js\nThe React framework.').installCommand, '');
    assert.equal(toRepository(data, 'Get started:\n\n```bash\nnpx create-next-app@latest\n```').installCommand, 'npx create-next-app@latest');
    assert.equal(toRepository(data, '```\n$ pip install httpx\n```').installCommand, 'pip install httpx');
  });

  test('dot segments cannot reach other GitHub API paths', () => {
    assert.ok(!isValidFullName('../user'));
    assert.ok(!isValidFullName('owner/..'));
    assert.ok(!isValidFullName('./x'));
    assert.ok(isValidFullName('owner/.github'));
    assert.ok(isValidFullName('vercel/next.js'));
  });
});

describe('package checks', () => {
  test('names are cleaned of versions and invalid names are refused', () => {
    assert.equal(normalizePackageName('npm', 'react@18.3.1'), 'react');
    assert.equal(normalizePackageName('npm', '@types/node@latest'), '@types/node');
    assert.equal(normalizePackageName('npm', '@hello-pangea/dnd'), '@hello-pangea/dnd');
    assert.equal(normalizePackageName('pypi', 'requests==2.31'), 'requests');
    assert.equal(normalizePackageName('pypi', 'uvicorn[standard]>=0.30'), 'uvicorn');
    assert.equal(normalizePackageName('npm', '../../etc/passwd'), null);
    assert.equal(normalizePackageName('npm', 'rm -rf /'), null);
    assert.equal(normalizePackageName('pypi', 'https://evil.example/x'), null);
  });

  test('verdicts follow the evidence', () => {
    const now = Date.parse('2026-10-23T00:00:00Z');
    const base = { ecosystem: 'npm' as const, name: 'x', latestVersion: '1.0.0', weeklyDownloads: 1, deprecationNotice: null, repository: 'o/x', repositoryArchived: false, lastCommitAt: '2026-10-01T00:00:00Z', registryUrl: null };
    assert.equal(judgePackage(null, 'npm', 'made-up-pkg', now).verdict, 'missing');
    assert.equal(judgePackage({ ...base, lastReleaseAt: '2026-09-01T00:00:00Z', deprecationNotice: 'use y instead' }, 'npm', 'x', now).verdict, 'deprecated');
    assert.equal(judgePackage({ ...base, lastReleaseAt: '2026-09-01T00:00:00Z', repositoryArchived: true }, 'npm', 'x', now).verdict, 'archived');
    assert.equal(judgePackage({ ...base, lastReleaseAt: '2021-11-06T00:00:00Z', lastCommitAt: '2024-07-01T00:00:00Z' }, 'npm', 'x', now).verdict, 'stale');
    assert.equal(judgePackage({ ...base, lastReleaseAt: '2023-02-09T00:00:00Z' }, 'npm', 'x', now).verdict, 'dormant');
    assert.equal(judgePackage({ ...base, lastReleaseAt: '2026-10-12T00:00:00Z' }, 'npm', 'x', now).verdict, 'ok');
    assert.equal(judgePackage(null, 'pypi', 'argparse', now).verdict, 'ok');
  });

  test('install hook finds packages in real install commands', async () => {
    const { findInstalls } = await import('../public/hooks/replex-check.mjs');
    const npm = (cmd: string) => findInstalls(cmd).npm;
    const pypi = (cmd: string) => findInstalls(cmd).pypi;
    assert.deepEqual(npm('npm i -D vitest @types/node'), ['vitest', '@types/node']);
    assert.deepEqual(npm('cd app && pnpm add react-beautiful-dnd --filter web'), ['react-beautiful-dnd']);
    assert.deepEqual(npm('yarn add "zod@^4"'), ['zod@^4']);
    assert.deepEqual(npm('NODE_ENV=dev bun add visx'), ['visx']);
    assert.deepEqual(npm('npm install'), [], 'lockfile installs are not checked');
    assert.deepEqual(npm('npm install ./local-pkg ../x.tgz github:user/repo user/repo https://x.dev/a.tgz'), []);
    assert.deepEqual(npm('npm run build && npx create-next-app'), [], 'running is not installing');
    assert.deepEqual(pypi('pip install "requests>=2" fuzzywuzzy -r requirements.txt'), ['requests>=2', 'fuzzywuzzy']);
    assert.deepEqual(pypi('python3 -m pip install --upgrade requests-html'), ['requests-html']);
    assert.deepEqual(pypi('uv add httpx; uv pip install -e . PyPDF2'), ['httpx', 'PyPDF2']);
    assert.deepEqual(pypi('poetry add typer && pipx install ruff'), ['typer', 'ruff']);
    assert.deepEqual(findInstalls('git status'), { npm: [], pypi: [] });
  });

  test('check_packages validates its input', async () => {
    const res = (await handleMessage(
      { jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'check_packages', arguments: { ecosystem: 'cargo', packages: ['serde'] } } },
      caller,
    )) as any;
    assert.equal(res.result.isError, true);
    assert.match(res.result.content[0].text, /npm|pypi/);
  });
});

describe('classification', () => {
  const classify = (name: string, description: string, topics: string[] = [], primaryLanguage = 'TypeScript') =>
    classifyRepository({ name, description, topics, primaryLanguage });

  test('reverse engineering tools are Security', () => {
    const r = classify('ghidra', 'A software reverse engineering (SRE) framework', [], 'Java');
    assert.equal(r.technicalCategory, 'Security');
    assert.ok(r.subcategories.includes('Reverse Engineering'));
  });

  test('topics outweigh incidental words', () => {
    assert.equal(classify('ui', 'Components built with Radix and Tailwind', ['components', 'shadcn']).technicalCategory, 'Design & UI');
    assert.equal(classify('vllm', 'High-throughput LLM inference engine', [], 'Python').technicalCategory, 'AI & Machine Learning');
  });

  test('substrings do not trigger categories ("rag" in storage, "agent" in user-agent)', () => {
    assert.equal(classify('storage-kit', 'Object storage for user-agent logs', [], 'Go').technicalCategory, 'Other / Unclassified');
  });
});

describe('MCP protocol', () => {
  test('initialize negotiates a supported protocol version', async () => {
    const res = (await handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }, caller)) as any;
    assert.equal(res.result.protocolVersion, '2025-06-18');
    assert.equal(res.result.serverInfo.name, 'replex');
    const fallback = (await handleMessage({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } }, caller)) as any;
    assert.equal(fallback.result.protocolVersion, '2025-11-25');
  });

  test('tools/list exposes every tool with a schema and no internals', async () => {
    const res = (await handleMessage({ jsonrpc: '2.0', id: 3, method: 'tools/list' }, caller)) as any;
    assert.equal(res.result.tools.length, TOOLS.length);
    for (const t of res.result.tools) {
      assert.equal(typeof t.name, 'string');
      assert.equal(t.inputSchema.type, 'object');
      assert.equal(t.run, undefined);
    }
  });

  test('unknown method and unknown tool are JSON-RPC errors', async () => {
    const m = (await handleMessage({ jsonrpc: '2.0', id: 4, method: 'resources/list' }, caller)) as any;
    assert.equal(m.error.code, -32601);
    const t = (await handleMessage({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'drop_tables' } }, caller)) as any;
    assert.equal(t.error.code, -32602);
  });

  test('tool failures are reported as isError results, not crashes', async () => {
    const res = (await handleMessage(
      { jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'get_repository', arguments: { full_name: 'not a repo' } } },
      caller,
    )) as any;
    assert.equal(res.result.isError, true);
    assert.match(res.result.content[0].text, /owner\/repo/);
  });

  test('agent access is read-only: no write tools, no write scopes for keys', async () => {
    for (const t of TOOLS) assert.match(t.scope, /:read$/, `${t.name} must be read-only`);
    const res = (await handleMessage(
      { jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'save_to_collection', arguments: { collection: 'x', full_name: 'a/b' } } },
      caller,
    )) as any;
    assert.equal(res.error.code, -32602);
    assert.ok(API_KEY_SCOPES.every((s) => !s.endsWith(':write') && s !== 'keys:manage'));
  });

  test('every tool declares a scope and read tools enforce theirs', async () => {
    for (const t of TOOLS) assert.match(t.scope, /^(search|repositories|library):(read|write)$/);
    const narrow = { ...caller, scopes: ['mcp:invoke'] };
    const res = (await handleMessage(
      { jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'list_collections', arguments: {} } },
      narrow,
    )) as any;
    assert.equal(res.result.isError, true);
    assert.match(res.result.content[0].text, /library:read/);
  });

  test('library tools without a database report a safe, expected error', async () => {
    const res = (await handleMessage(
      { jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'list_collections', arguments: {} } },
      caller,
    )) as any;
    assert.equal(res.result.isError, true);
    assert.match(res.result.content[0].text, /not configured/);
  });
});

describe('HTTP API', () => {
  let base = '';
  let server: ReturnType<typeof app.listen>;
  before(async () => {
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(() => server.close());

  test('health reports configuration without secrets', async () => {
    const res = await fetch(`${base}/api/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.accounts, false);
    assert.equal(body.tokenEncryption, true);
    assert.ok(!JSON.stringify(body).includes(process.env.TOKEN_ENCRYPTION_KEY!));
  });

  test('MCP requires a bearer key and advertises the scheme', async () => {
    const res = await fetch(`${base}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    assert.equal(res.status, 401);
    assert.match(res.headers.get('www-authenticate') || '', /Bearer/);
    const body = await res.json();
    assert.equal(body.jsonrpc, '2.0');
    assert.ok(body.error);
  });

  test('MCP GET is not supported (stateless JSON transport)', async () => {
    const res = await fetch(`${base}/api/mcp`);
    assert.equal(res.status, 405);
  });

  test('account routes reject anonymous callers', async () => {
    const res = await fetch(`${base}/api/v1/me/keys`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"name":"x"}' });
    assert.equal(res.status, 401);
  });

  test('oversized bodies are refused', async () => {
    const res = await fetch(`${base}/api/v1/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullNames: ['a/b', 'c/d'], targetStack: 'x'.repeat(100_000) }),
    });
    assert.equal(res.status, 413);
  });

  test('bad repository names are rejected before calling GitHub', async () => {
    const res = await fetch(`${base}/api/v1/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullNames: ['../x', 'y'] }),
    });
    assert.equal(res.status, 400);
  });

  test('AI search requires sign-in and reports its status', async () => {
    const res = await fetch(`${base}/api/v1/ai/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'a decompiler for android apps' }),
    });
    assert.equal(res.status, 401);
    const status = await (await fetch(`${base}/api/v1/ai/status`)).json();
    assert.equal(status.signedIn, false);
    assert.equal(typeof status.limit, 'number');
  });

  test('AI repository review requires sign-in', async () => {
    const get = await fetch(`${base}/api/v1/repos/skylot/jadx/review`);
    assert.equal(get.status, 401);
    const post = await fetch(`${base}/api/v1/repos/skylot/jadx/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(post.status, 401);
  });

  test('unknown API routes are JSON 404s', async () => {
    const res = await fetch(`${base}/api/nope`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error, 'Not found');
  });
});
