// Combines checked runs into results/COMPARISON.md.
// Usage: npx tsx compare.ts   (reads every results/*-chat-*.json)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PackageFacts, Verdict } from './check.ts';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'results');
interface Run {
  model: string;
  results: { id: string; picks: { rank: number; package: string; facts: PackageFacts }[] }[];
}

const DEAD: Verdict[] = ['missing', 'deprecated', 'archived', 'stale'];
const runs = readdirSync(dir)
  .filter((f) => /-chat-\d+\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Run);

const byModel = new Map<string, Run[]>();
for (const run of runs) {
  const name = run.model.replace(/-chat-\d+$/, '');
  byModel.set(name, [...(byModel.get(name) ?? []), run]);
}

const label = (m: string) => ({ chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini' })[m] ?? m;
const fmt = (n: number | null) => (n === null ? '–' : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));

const rows: string[] = [];
const offenders = new Map<string, { facts: PackageFacts; by: Set<string>; ranks: number[] }>();
for (const [model, list] of byModel) {
  const picks = list.flatMap((r) => r.results.flatMap((t) => t.picks));
  const firsts = picks.filter((p) => p.rank === 1);
  const dead = picks.filter((p) => DEAD.includes(p.facts.verdict));
  const dormant = picks.filter((p) => p.facts.verdict === 'dormant');
  // Consistency: share of tasks whose set of 3 picks is identical across runs.
  const ids = list[0].results.map((t) => t.id);
  const same = ids.filter((id) => {
    const sets = list.map((r) => (r.results.find((t) => t.id === id)?.picks.map((p) => p.package).sort().join(',') ?? ''));
    return sets.every((s) => s === sets[0]);
  }).length;
  rows.push(
    `| ${label(model)} | ${list.length} | ${picks.length} | ${dead.length} (${Math.round((dead.length / picks.length) * 100)}%) | ${firsts.filter((p) => DEAD.includes(p.facts.verdict)).length} of ${firsts.length} | ${dormant.length} | ${Math.round((same / ids.length) * 100)}% |`,
  );
  for (const p of [...dead, ...dormant]) {
    const key = `${p.facts.ecosystem}:${p.facts.name}`;
    const entry = offenders.get(key) ?? { facts: p.facts, by: new Set(), ranks: [] };
    entry.by.add(label(model));
    entry.ranks.push(p.rank);
    offenders.set(key, entry);
  }
}

const offenderRows = [...offenders.values()]
  .sort((a, b) => Number(DEAD.includes(b.facts.verdict)) - Number(DEAD.includes(a.facts.verdict)) || b.by.size - a.by.size)
  .map((o) => `| \`${o.facts.name}\` | ${o.facts.verdict} | ${o.facts.reason.replace(/\|/g, '/')} | ${[...o.by].join(', ')} | ${Math.min(...o.ranks)} | ${fmt(o.facts.weeklyDownloads)} |`);

const md = [
  '# Which libraries do AI chat assistants pick?',
  '',
  `Chat apps with web search off, the prompt in \`PROMPT.md\`, 26 everyday tasks × top 3 picks, ${runs.length} runs. Every pick checked against npm / PyPI / GitHub on ${new Date().toISOString().slice(0, 10)}.`,
  '',
  '**Dead** = made-up name, deprecated, archived, or no release for 2+ years and no commit for 1+ year. **Dormant** = no release for 3+ years while the repository stays active (often renamed or superseded).',
  '',
  '| Assistant | Runs | Picks | Dead picks | Dead first picks | Dormant picks | Same 3 picks both runs |',
  '|---|---|---|---|---|---|---|',
  ...rows,
  '',
  '## Every dead or dormant pick',
  '',
  '| Package | Verdict | Evidence | Picked by | Best rank | Weekly downloads |',
  '|---|---|---|---|---|---|',
  ...offenderRows,
  '',
];
writeFileSync(join(dir, 'COMPARISON.md'), md.join('\n'));
console.log(md.join('\n'));
