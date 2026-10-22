// Usage (from this folder):
//   GITHUB_TOKEN=$(gh auth token) npx tsx run.ts --provider gemini --model gemini-3.5-flash
//   npx tsx run.ts --provider claude --model claude-opus-5-5        (needs Anthropic credentials; paid)
// Writes results/<date>-<model>.json and .md
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPackage, type PackageFacts, type Verdict } from './check.ts';
import { ask, question, type Provider } from './models.ts';
import { TASKS } from './tasks.ts';

const here = dirname(fileURLToPath(import.meta.url));
for (const f of ['../../.env.local', '../../.env']) {
  const p = join(here, f);
  if (existsSync(p)) process.loadEnvFile(p);
}

const arg = (name: string, fallback = '') => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const provider = arg('provider', 'gemini') as Provider;
// --from <file.json>: check answers pasted from a chat app instead of asking a
// model. The file is the JSON array the chat returned: [{ id, picks: [...] }].
const from = arg('from');
const model = arg('label') || arg('model', provider === 'gemini' ? 'gemini-3.5-flash' : 'claude-opus-5-5');
const pasted = new Map<string, string[]>();
if (from) {
  const raw = readFileSync(from, 'utf8');
  const json = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1));
  for (const row of json) pasted.set(String(row.id), (row.picks ?? []).map((p: unknown) => String(typeof p === 'object' && p ? (p as { package?: string }).package : p)));
}
const only = arg('only').split(',').filter(Boolean);
const tasks = (only.length ? TASKS.filter((t) => only.includes(t.id)) : TASKS).filter((t) => !from || pasted.has(t.id));

interface TaskResult {
  id: string;
  ecosystem: string;
  task: string;
  question: string;
  refused?: string;
  error?: string;
  picks: { rank: number; package: string; why: string; facts: PackageFacts }[];
}

const results: TaskResult[] = [];
for (const [i, t] of tasks.entries()) {
  const row: TaskResult = { id: t.id, ecosystem: t.ecosystem, task: t.task, question: question(t), picks: [] };
  try {
    const answer = from ? { picks: pasted.get(t.id)!.map((p) => ({ package: p, why: '' })) } : await ask(provider, model, t);
    row.refused = answer.refused;
    const picks = answer.picks.slice(0, 3);
    const facts = await Promise.all(picks.map((p) => checkPackage(t.ecosystem, p.package)));
    row.picks = picks.map((p, rank) => ({ rank: rank + 1, package: p.package, why: p.why, facts: facts[rank] }));
  } catch (err) {
    row.error = (err as Error).message;
  }
  results.push(row);
  const summary = row.error ? `ERROR ${row.error}` : row.picks.map((p) => `${p.package}=${p.facts.verdict}`).join(', ');
  console.log(`[${i + 1}/${tasks.length}] ${t.id}: ${summary}`);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const all = results.flatMap((r) => r.picks);
const top = results.map((r) => r.picks[0]).filter(Boolean);
const count = (list: typeof all, v: Verdict) => list.filter((p) => p.facts.verdict === v).length;
const bad: Verdict[] = ['missing', 'deprecated', 'archived', 'stale'];
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '–');
const fmtNum = (n: number | null) => (n === null ? '–' : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));
const date = new Date().toISOString().slice(0, 10);

const lines = [
  `# Agent picks: ${model}`,
  '',
  `Run ${new Date().toISOString()} · ${results.length} tasks · ${all.length} recommended packages · question asked without web access.`,
  '',
  '## Summary',
  '',
  '| | All picks | First picks |',
  '|---|---|---|',
  ...bad.map((v) => `| ${v} | ${count(all, v)} (${pct(count(all, v), all.length)}) | ${count(top, v)} (${pct(count(top, v), top.length)}) |`),
  `| **any problem** | **${all.filter((p) => bad.includes(p.facts.verdict)).length} (${pct(all.filter((p) => bad.includes(p.facts.verdict)).length, all.length)})** | **${top.filter((p) => bad.includes(p.facts.verdict)).length} (${pct(top.filter((p) => bad.includes(p.facts.verdict)).length, top.length)})** |`,
  '',
  `Errors: ${results.filter((r) => r.error).length} · refusals: ${results.filter((r) => r.refused).length}`,
  '',
  '## Problem picks',
  '',
  '| Task | Rank | Package | Verdict | Why | Weekly downloads |',
  '|---|---|---|---|---|---|',
  ...results.flatMap((r) =>
    r.picks.filter((p) => bad.includes(p.facts.verdict)).map((p) => `| ${r.id} | ${p.rank} | \`${p.package}\` | ${p.facts.verdict} | ${p.facts.reason.replace(/\|/g, '/')} | ${fmtNum(p.facts.weeklyDownloads)} |`),
  ),
  '',
  '## All picks',
  '',
  '| Task | 1st | 2nd | 3rd |',
  '|---|---|---|---|',
  ...results.map((r) => `| ${r.id} | ${[0, 1, 2].map((i) => (r.picks[i] ? `\`${r.picks[i].package}\` ${r.picks[i].facts.verdict === 'ok' ? '' : `(**${r.picks[i].facts.verdict}**)`}` : r.error ? 'error' : '–')).join(' | ')} |`),
];

mkdirSync(join(here, 'results'), { recursive: true });
const base = join(here, 'results', `${date}-${model}`);
writeFileSync(`${base}.json`, JSON.stringify({ provider, model, runAt: new Date().toISOString(), results }, null, 2));
writeFileSync(`${base}.md`, lines.join('\n') + '\n');
console.log(`\nWrote ${base}.json and .md`);
console.log(lines.slice(4, 13).join('\n'));
