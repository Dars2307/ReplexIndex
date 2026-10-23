import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Card, CodeBlock, Segmented } from './ui.tsx';

type Agent = 'claude-code' | 'cursor';

const json = (value: unknown) => JSON.stringify(value, null, 2);

const SETUP: Record<Agent, { dir: string; file: string; config: string; hook: () => string }> = {
  'claude-code': {
    dir: '.claude/hooks',
    file: '~/.claude/settings.json — merge into an existing "hooks" block if you have one',
    config: 'settings',
    hook: () =>
      json({
        hooks: {
          PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node "$HOME/.claude/hooks/replex-check.mjs"', timeout: 15 }] }],
        },
      }),
  },
  cursor: {
    dir: '.cursor/hooks',
    file: '~/.cursor/hooks.json — Cursor reloads it on save',
    config: 'hooks',
    hook: () =>
      json({
        version: 1,
        hooks: {
          beforeShellExecution: [{ command: 'node ./hooks/replex-check.mjs', timeout: 15, matcher: 'npm|pnpm|yarn|bun|pip|python|uv|poetry|pdm|pipx' }],
        },
      }),
  },
};

/** Setup for the pre-install hook that checks packages with Replex before an agent installs them. */
export function InstallCheck({ origin, apiKey, initial }: { origin: string; apiKey: string; initial: Agent }) {
  const [agent, setAgent] = useState<Agent>(initial);
  const setup = SETUP[agent];
  const script = `${origin}/hooks/replex-check.mjs`;
  const config = JSON.stringify({ url: origin, apiKey });
  const unix = [
    `mkdir -p ~/${setup.dir}`,
    `curl -fsSL ${script} -o ~/${setup.dir}/replex-check.mjs`,
    `printf '%s' '${config}' > ~/.replex.json && chmod 600 ~/.replex.json`,
  ].join('\n');
  const windows = [
    `New-Item -ItemType Directory -Force "$HOME\\${setup.dir.replace('/', '\\')}" | Out-Null`,
    `Invoke-WebRequest -UseBasicParsing ${script} -OutFile "$HOME\\${setup.dir.replace('/', '\\')}\\replex-check.mjs"`,
    `Set-Content -Encoding utf8 "$HOME\\.replex.json" '${config}'`,
  ].join('\n');

  return (
    <Card aria-labelledby="install-check-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h2 id="install-check-title" className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-4 text-fg-subtle" aria-hidden /> Install check
        </h2>
        <Segmented
          label="Agent for the install check"
          value={agent}
          onChange={setAgent}
          options={[
            { value: 'claude-code', label: 'Claude Code' },
            { value: 'cursor', label: 'Cursor' },
          ]}
        />
      </div>
      <div className="space-y-4 px-5 pb-5 pt-4">
        <p className="text-[13.5px] text-fg-muted">
          Runs automatically before your agent installs an npm or PyPI package. Packages that don’t exist, are deprecated or are archived are stopped, and the agent is told why so it
          can pick another. Unmaintained ones go through with a note. If Replex can’t be reached, installs go ahead as normal.
        </p>
        <section>
          <h3 className="text-[13px] font-semibold text-fg">1. Download the hook and save your key</h3>
          <p className="mt-1 text-[12.5px] text-fg-subtle">Uses the key shown in the setup above; your key is stored in ~/.replex.json on your machine only. Needs Node.js 18 or later.</p>
          <CodeBlock className="mt-2" label="macOS / Linux / Git Bash" code={unix} />
          <CodeBlock className="mt-2" label="Windows PowerShell" code={windows} />
        </section>
        <section>
          <h3 className="text-[13px] font-semibold text-fg">2. Turn it on</h3>
          <p className="mt-1 text-[12.5px] text-fg-subtle">{setup.file}</p>
          <CodeBlock className="mt-2" code={setup.hook()} />
        </section>
        <p className="text-[12.5px] text-fg-subtle">
          Private packages: set <code className="font-mono">REPLEX_ALLOW</code> (for example <code className="font-mono">@mycorp/,internal-lib</code>) or add{' '}
          <code className="font-mono">"allow": [...]</code> to ~/.replex.json. Read the script before running it:{' '}
          <a href={script} target="_blank" rel="noreferrer" className="text-link hover:underline">
            replex-check.mjs
          </a>
          .
        </p>
      </div>
    </Card>
  );
}
