#!/usr/bin/env node
// Replex install check — a pre-command hook for Claude Code and Cursor.
//
// Before the agent runs a command that installs npm or PyPI packages, this asks
// Replex whether each package exists, is deprecated or archived, or has gone
// stale. Missing, deprecated and archived packages are blocked with a reason the
// agent can act on; everything else goes through. If Replex can't be reached the
// command is allowed, so an outage never blocks your work.
//
// Setup: https://replex-index-psi.vercel.app/agents (Install check)
// Config: REPLEX_API_KEY and REPLEX_URL in the environment, or ~/.replex.json:
//   { "url": "https://replex-index-psi.vercel.app", "apiKey": "rpx_..." }
// Optional: REPLEX_ALLOW="@mycorp/,internal-pkg" skips private packages.
// Node.js 18+, no dependencies.

import { readFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BLOCK = new Set(['missing', 'deprecated', 'archived']);
const TIMEOUT_MS = 8000;
// REPLEX_DEBUG=1 explains every decision on stderr (agents don't see stderr on exit 0).
const debug = (...args) => process.env.REPLEX_DEBUG && process.stderr.write(`[replex-check] ${args.join(' ')}\n`);

// --- Reading the hook input --------------------------------------------------
// Read stdin as a stream: readFileSync(0) fails on pipes from PowerShell, which
// is how Cursor runs hooks on Windows.
async function readStdin() {
  let text = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) text += chunk;
  try {
    return JSON.parse(text.replace(/^﻿/, '') || '{}');
  } catch {
    return {};
  }
}

function config() {
  let file = {};
  try {
    // Windows PowerShell 5.1 writes UTF-8 with a byte-order mark; strip it.
    file = JSON.parse(readFileSync(join(homedir(), '.replex.json'), 'utf8').replace(/^﻿/, ''));
  } catch {}
  return {
    url: (process.env.REPLEX_URL || file.url || 'https://replex-index-psi.vercel.app').replace(/\/+$/, ''),
    apiKey: process.env.REPLEX_API_KEY || file.apiKey || '',
    allow: (process.env.REPLEX_ALLOW || (file.allow ?? []).join(',')).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  };
}

// --- Finding installs in a shell command -------------------------------------
const tokenize = (segment) => (segment.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((t) => t.replace(/^(["'])(.*)\1$/, '$2'));

// Flags whose next token is a value, not a package.
const VALUE_FLAGS = new Set([
  '--registry', '--prefix', '--workspace', '-w', '--filter', '-F', '--tag', '--cwd', '-C', '--save-prefix',
  '-r', '--requirement', '-c', '--constraint', '-e', '--editable', '-i', '--index-url', '--extra-index-url',
  '-f', '--find-links', '-t', '--target', '--python', '-p', '--group', '-G', '--source', '--platform', '--root',
]);

function packageArgs(tokens, ecosystem) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (VALUE_FLAGS.has(t)) {
      i++;
      continue;
    }
    if (t.startsWith('-')) continue;
    if (/:\/\/|^(git\+|github:|gitlab:|bitbucket:|file:|link:|workspace:|portal:|patch:)/i.test(t)) continue; // URLs and non-registry specs
    if (/^[.~/\\]|^[a-z]:[\\/]/i.test(t) || /\.(tgz|tar\.gz|whl|zip)$/i.test(t)) continue; // local paths and archives
    if (ecosystem === 'npm' && !t.startsWith('@') && t.includes('/')) continue; // GitHub shorthand user/repo
    if (ecosystem === 'npm' && /@npm:/.test(t)) continue; // aliases
    if (ecosystem === 'pypi' && /[/\\]/.test(t)) continue;
    out.push(t);
  }
  return out;
}

export function findInstalls(command) {
  const found = { npm: [], pypi: [] };
  for (const segment of String(command).split(/&&|\|\||;|\||\r?\n/)) {
    let tokens = tokenize(segment.trim());
    while (tokens.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0]) || tokens[0] === 'sudo')) tokens = tokens.slice(1);
    if (!tokens.length) continue;
    const [cmd, sub, ...rest] = tokens;
    const tool = cmd.replace(/\.(exe|cmd)$/i, '').toLowerCase();
    // npm family
    if (tool === 'npm' && ['install', 'i', 'in', 'add', 'isntall'].includes(sub)) found.npm.push(...packageArgs(rest, 'npm'));
    else if (tool === 'pnpm' && ['add', 'install', 'i'].includes(sub)) found.npm.push(...packageArgs(rest, 'npm'));
    else if (tool === 'yarn' && sub === 'add') found.npm.push(...packageArgs(rest, 'npm'));
    else if (tool === 'bun' && ['add', 'install', 'i'].includes(sub)) found.npm.push(...packageArgs(rest, 'npm'));
    // Python family
    else if (/^pip(3(\.\d+)?)?$/.test(tool) && sub === 'install') found.pypi.push(...packageArgs(rest, 'pypi'));
    else if (/^(python(3(\.\d+)?)?|py)$/.test(tool) && sub === '-m' && /^pip3?$/.test(rest[0] ?? '') && rest[1] === 'install') found.pypi.push(...packageArgs(rest.slice(2), 'pypi'));
    else if (tool === 'uv' && sub === 'add') found.pypi.push(...packageArgs(rest, 'pypi'));
    else if (tool === 'uv' && sub === 'pip' && rest[0] === 'install') found.pypi.push(...packageArgs(rest.slice(1), 'pypi'));
    else if (['poetry', 'pdm'].includes(tool) && sub === 'add') found.pypi.push(...packageArgs(rest, 'pypi'));
    else if (tool === 'pipx' && sub === 'install') found.pypi.push(...packageArgs(rest, 'pypi'));
  }
  return { npm: [...new Set(found.npm)].slice(0, 20), pypi: [...new Set(found.pypi)].slice(0, 20) };
}

// --- Asking Replex -------------------------------------------------------------
// node:http with no keep-alive agent rather than fetch: on Windows, exiting
// while fetch's pooled sockets close crashes Node (exit 127), and both Claude
// Code and Cursor treat that as "hook failed, let the command run".
function check(cfg, ecosystem, packages) {
  const url = new URL(`${cfg.url}/api/v1/packages/check`);
  const body = JSON.stringify({ ecosystem, packages });
  const send = url.protocol === 'http:' ? httpRequest : httpsRequest;
  return new Promise((resolve, reject) => {
    const req = send(
      url,
      {
        method: 'POST',
        agent: false,
        timeout: TIMEOUT_MS,
        headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) return reject(new Error(`Replex HTTP ${res.statusCode}`));
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('Replex timed out')));
    req.on('error', reject);
    req.end(body);
  });
}

// --- Answering in each agent's format -------------------------------------------
function respond(input, decision, agentText, userText) {
  if (input.hook_event_name === 'beforeShellExecution') {
    // Cursor: always print an explicit decision; empty output is ambiguous.
    const out = { permission: decision };
    if (agentText) out.agent_message = agentText;
    if (userText) out.user_message = userText;
    process.stdout.write(JSON.stringify(out));
  } else if (decision === 'deny') {
    // Claude Code PreToolUse: the reason is shown to Claude.
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: agentText } }));
  } else if (agentText) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: agentText } }));
  }
  // Let Node exit on its own once output is flushed (see check()).
  process.exitCode = 0;
}

async function main() {
  const input = await readStdin();
  const command = input.tool_input?.command ?? input.command ?? '';
  const installs = findInstalls(command);
  const cfg = config();
  const skip = (name) => cfg.allow.some((a) => (a.endsWith('/') ? name.toLowerCase().startsWith(a) : name.toLowerCase() === a));
  const wanted = [['npm', installs.npm.filter((n) => !skip(n))], ['pypi', installs.pypi.filter((n) => !skip(n))]].filter(([, list]) => list.length);
  debug(`event=${input.hook_event_name ?? 'none'} url=${cfg.url} key=${cfg.apiKey ? 'set' : 'MISSING'} installs=${JSON.stringify(installs)}`);
  if (!wanted.length || !cfg.apiKey) return respond(input, 'allow');

  let results = [];
  try {
    for (const [ecosystem, packages] of wanted) results.push(...(await check(cfg, ecosystem, packages)).results);
  } catch (err) {
    debug(`check failed, allowing: ${err.message}`);
    return respond(input, 'allow'); // fail open: an outage must not block work
  }
  debug(`verdicts: ${results.map((r) => `${r.name}=${r.verdict}`).join(', ')}`);

  const blocked = results.filter((r) => BLOCK.has(r.verdict));
  const warned = results.filter((r) => r.verdict === 'stale' || r.verdict === 'dormant');
  const line = (r) => `- ${r.name}: ${r.verdict} — ${r.reason}`;
  if (blocked.length) {
    const agent = [
      'Replex stopped this install. These packages should not be added:',
      ...blocked.map(line),
      ...(warned.length ? ['Also worth a second look:', ...warned.map(line)] : []),
      'Pick a maintained alternative (a deprecation notice often names one) and try again. If the user confirms a package is right (for example a private one), they can add it to REPLEX_ALLOW.',
    ].join('\n');
    return respond(input, 'deny', agent, `Replex blocked: ${blocked.map((r) => `${r.name} (${r.verdict})`).join(', ')}`);
  }
  if (warned.length) {
    return respond(input, 'allow', ['Replex check: installing, but these look unmaintained — mention it to the user or consider an alternative:', ...warned.map(line)].join('\n'));
  }
  return respond(input, 'allow');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main().catch(() => respond({}, 'allow'));
}
