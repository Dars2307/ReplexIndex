// "How AI assistants see your library": per-brand visibility across checked runs.
// Usage:
//   npx tsx visibility.ts --round auth                      (all brands, auth deep dive)
//   npx tsx visibility.ts --round chat --tasks next-auth --brand "Better Auth"
// Writes results/visibility-<round>[-<brand>].md
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PackageFacts, Verdict } from './check.ts';
import { ALL_TASKS } from './tasks.ts';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'results');
const arg = (name: string, fallback = '') => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const round = arg('round', 'chat');
const onlyTasks = arg('tasks').split(',').filter(Boolean);
const focus = arg('brand');

interface Run {
  model: string;
  results: { id: string; picks: { rank: number; package: string; facts: PackageFacts }[] }[];
}

// Packages from one company count as one brand.
const BRANDS: [string, (p: string) => boolean][] = [
  ['Auth.js (NextAuth)', (p) => p === 'next-auth' || p.startsWith('@auth/')],
  ['Clerk', (p) => p.startsWith('@clerk/')],
  ['Supabase', (p) => p.startsWith('@supabase/')],
  ['Better Auth', (p) => p === 'better-auth' || p.startsWith('@better-auth/')],
  ['Lucia', (p) => p === 'lucia' || p.startsWith('@lucia-auth/')],
  ['Firebase', (p) => /^(firebase|firebase-admin)$/.test(p) || p.startsWith('@firebase/') || p.startsWith('@react-native-firebase/')],
  ['Auth0', (p) => p === 'auth0' || p.startsWith('@auth0/')],
  ['Passport', (p) => p === 'passport' || p.startsWith('passport-')],
  ['Kinde', (p) => p.startsWith('@kinde-oss/')],
  ['Stack Auth', (p) => p.startsWith('@stackframe/')],
  ['WorkOS', (p) => p.startsWith('@workos-inc/')],
  ['SimpleWebAuthn', (p) => p.startsWith('@simplewebauthn/')],
  ['Hanko', (p) => p.startsWith('@teamhanko/')],
  ['TanStack', (p) => p.startsWith('@tanstack/')],
  ['Redux', (p) => p === 'redux' || p.startsWith('@reduxjs/')],
  ['Tiptap', (p) => p.startsWith('@tiptap/')],
  ['Playwright', (p) => p === 'playwright' || p.startsWith('@playwright/')],
  ['dnd kit', (p) => p.startsWith('@dnd-kit/')],
  ['Nivo', (p) => p.startsWith('@nivo/')],
];
export function brandOf(pkg: string): string {
  const p = pkg.toLowerCase();
  const hit = BRANDS.find(([, test]) => test(p));
  if (hit) return hit[0];
  return p.startsWith('@') ? p.split('/')[0] : p;
}

const label = (m: string) => ({ chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini' })[m] ?? m;
const DEAD: Verdict[] = ['missing', 'deprecated', 'archived', 'stale'];
const taskText = new Map(ALL_TASKS.map((t) => [t.id, t.task]));

const runs = readdirSync(dir)
  .filter((f) => new RegExp(`-${round}-\\d+\\.json$`).test(f))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Run);
if (!runs.length) throw new Error(`No checked runs for round "${round}" in results/`);

// answers[assistant] = one entry per (run, task): the brands in rank order.
type Answer = { task: string; brands: string[]; dead: { pkg: string; verdict: Verdict; reason: string }[] };
const answers = new Map<string, Answer[]>();
for (const run of runs) {
  const who = label(run.model.replace(new RegExp(`-${round}-\\d+$`), ''));
  for (const t of run.results) {
    if (onlyTasks.length && !onlyTasks.includes(t.id)) continue;
    if (!t.picks.length) continue;
    const brands = [...new Set(t.picks.sort((a, b) => a.rank - b.rank).map((p) => brandOf(p.package)))];
    const dead = t.picks.filter((p) => DEAD.includes(p.facts.verdict)).map((p) => ({ pkg: p.package, verdict: p.facts.verdict, reason: p.facts.reason }));
    answers.set(who, [...(answers.get(who) ?? []), { task: t.id, brands, dead }]);
  }
}
const assistants = [...answers.keys()].sort();

// Brand stats per assistant.
const stats = new Map<string, Map<string, { mentions: number; firsts: number }>>();
for (const who of assistants) {
  for (const a of answers.get(who)!) {
    a.brands.forEach((b, i) => {
      const perBrand = stats.get(b) ?? new Map();
      const s = perBrand.get(who) ?? { mentions: 0, firsts: 0 };
      s.mentions += 1;
      if (i === 0) s.firsts += 1;
      perBrand.set(who, s);
      stats.set(b, perBrand);
    });
  }
}
const total = (b: string) => [...(stats.get(b)?.values() ?? [])].reduce((n, s) => n + s.mentions, 0);
const brands = [...stats.keys()].sort((a, b) => total(b) - total(a));
const cell = (b: string, who: string) => {
  const s = stats.get(b)?.get(who);
  const n = answers.get(who)!.length;
  if (!s) return `0 of ${n}`;
  return `${s.mentions} of ${n}${s.firsts ? ` · ${s.firsts} first` : ''}`;
};

const md: string[] = [
  focus ? `# How AI assistants see ${focus}` : `# Which brands AI assistants recommend (${round})`,
  '',
  `${runs.length} chat runs (web search off) across ${assistants.join(', ')}; ${onlyTasks.length ? `tasks: ${onlyTasks.join(', ')}` : `all ${round} tasks`}. ` +
    'Each cell: answers that recommend the brand (top 3) out of all answers, and how many put it first.',
  '',
  `| Brand | ${assistants.join(' | ')} |`,
  `|---|${assistants.map(() => '---').join('|')}|`,
  ...brands.slice(0, 25).map((b) => `| ${b === focus ? `**${b}**` : b} | ${assistants.map((w) => cell(b, w)).join(' | ')} |`),
  '',
];

if (focus) {
  md.push(`## ${focus}, task by task`, '', `| Task | ${assistants.join(' | ')} |`, `|---|${assistants.map(() => '---').join('|')}|`);
  const tasks = [...new Set(assistants.flatMap((w) => answers.get(w)!.map((a) => a.task)))];
  for (const task of tasks) {
    const row = assistants.map((w) => {
      const list = answers.get(w)!.filter((a) => a.task === task);
      const ranks = list.map((a) => a.brands.indexOf(focus)).map((i) => (i < 0 ? '—' : `#${i + 1}`));
      return ranks.join(', ');
    });
    md.push(`| ${taskText.get(task) ?? task} | ${row.join(' | ')} |`);
  }
  md.push('', '"—" means not recommended in that answer (one entry per run).', '', `## Recommended instead of ${focus}`, '');
  for (const w of assistants) {
    const instead = new Map<string, number>();
    for (const a of answers.get(w)!) if (!a.brands.includes(focus)) a.brands.forEach((b) => instead.set(b, (instead.get(b) ?? 0) + 1));
    const top = [...instead.entries()].sort((x, y) => y[1] - x[1]).slice(0, 6);
    md.push(`- **${w}:** ${top.length ? top.map(([b, n]) => `${b} (${n})`).join(', ') : `always recommends ${focus}`}`);
  }
  md.push('');
}

const deadRows = assistants.flatMap((w) => answers.get(w)!.flatMap((a) => a.dead.map((d) => `| ${w} | ${taskText.get(a.task) ?? a.task} | \`${d.pkg}\` | ${d.verdict} | ${d.reason.replace(/\|/g, '/').slice(0, 140)} |`)));
md.push('## Dead or broken recommendations in this set', '');
md.push(...(deadRows.length ? ['| Assistant | Task | Package | Verdict | Evidence |', '|---|---|---|---|---|', ...[...new Set(deadRows)]] : ['None.']), '');
md.push('## Method and limits', '', '- Chat apps with web search off, the same wording for every assistant, answers checked against npm / PyPI / GitHub.', '- Small samples: treat differences of one or two answers as noise.', '- Brands group a company\'s packages (for example every `@clerk/*` package counts as Clerk).', '');

const name = `visibility-${round}${focus ? `-${focus.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}` : ''}.md`;
writeFileSync(join(dir, name), md.join('\n'));
console.log(md.join('\n'));
console.log(`\nWrote results/${name}`);
