# Agent picks

A one-week experiment, separate from the Replex app: **when an AI model picks a
library for an everyday coding task, how often is that pick dead, deprecated or
made up?**

Each model gets the same plain question for 26 tasks (`tasks.ts`): "Which
package should I install? Top 3 picks." There is no web access, because that is
what an agent relies on when it adds a dependency without looking anything up.
Every recommended package is then checked against the live npm / PyPI registry
and GitHub (`check.ts`):

| Verdict | Meaning |
|---|---|
| `missing` | No such package on the registry (a made-up name; attackers register these) |
| `deprecated` | Marked deprecated on npm, "Inactive" on PyPI, or says so on GitHub |
| `archived` | The GitHub repository is archived |
| `stale` | No release for 2+ years and no commit for 1+ year |
| `ok` | Exists and is maintained |

It does **not** judge "maintained, but there is something better now". A
maintained-but-dated pick counts as `ok`.

## Run

```bash
npm install
GITHUB_TOKEN=$(gh auth token) npx tsx run.ts --provider gemini --model gemini-3.5-flash
GITHUB_TOKEN=$(gh auth token) npx tsx run.ts --provider claude --model claude-opus-5-5   # paid; needs Anthropic credentials
```

Add `--only node-http,js-dates` to run some tasks. Results land in `results/`
as JSON (everything) and Markdown (summary).

Keys come from the repo's `.env` / `.env.local` (`GEMINI_API_KEY`) or the
environment (`ANTHROPIC_API_KEY`). Nothing here is part of the deployed app.
