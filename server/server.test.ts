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
const { buildGithubQuery, isValidFullName } = await import('./github.ts');
const { handleMessage, TOOLS } = await import('./mcp.ts');
const { classifyRepository } = await import('../src/engines/classification.ts');
const { app } = await import('./app.ts');

// A read-only key: everything except library:write.
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

  test('dot segments cannot reach other GitHub API paths', () => {
    assert.ok(!isValidFullName('../user'));
    assert.ok(!isValidFullName('owner/..'));
    assert.ok(!isValidFullName('./x'));
    assert.ok(isValidFullName('owner/.github'));
    assert.ok(isValidFullName('vercel/next.js'));
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

  test('save_to_collection requires the library:write scope', async () => {
    const res = (await handleMessage(
      { jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'save_to_collection', arguments: { collection: 'x', full_name: 'a/b' } } },
      caller,
    )) as any;
    assert.equal(res.result.isError, true);
    assert.match(res.result.content[0].text, /library:write/);
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

  test('unknown API routes are JSON 404s', async () => {
    const res = await fetch(`${base}/api/nope`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error, 'Not found');
  });
});
