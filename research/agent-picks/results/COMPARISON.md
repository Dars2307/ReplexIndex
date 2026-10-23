# Which libraries do AI chat assistants pick?

Chat apps with web search off, the prompt in `PROMPT.md`, 26 everyday tasks × top 3 picks, 6 runs.
Every pick checked against npm / PyPI / GitHub on 2026-10-22.

**Dead** = made-up name, deprecated, archived, or no release for 2+ years and no commit for 1+ year. **Dormant** = no release for 3+ years while the repository stays active (often renamed or superseded).

| Assistant | Runs | Picks | Dead picks | Dead first picks | Dormant picks | Same 3 picks both runs |
|---|---|---|---|---|---|---|
| ChatGPT | 2 | 156 | 8 (5%) | 1 of 52 | 3 | 96% |
| Claude | 2 | 156 | 10 (6%) | 0 of 52 | 2 | 69% |
| Gemini | 2 | 156 | 11 (7%) | 0 of 52 | 8 | 58% |

## Every dead or dormant pick

| Package | Verdict | Evidence | Picked by | Best rank | Weekly downloads |
|---|---|---|---|---|---|
| `bunyan` | stale | Last release 5.8 years ago, last commit 3.1 years ago | ChatGPT, Claude, Gemini | 3 | 2.4M |
| `react-dnd` | stale | Last release 4.5 years ago, last commit 1.3 years ago | ChatGPT, Claude, Gemini | 2 | 3.1M |
| `uWebSockets.js` | missing | Real project (uNetworking/uWebSockets.js) but not on npm under this name; the install command fails | ChatGPT, Claude, Gemini | 3 | – |
| `pdf-lib` | stale | Last release 5.0 years ago, last commit 2.3 years ago | ChatGPT, Claude | 1 | 11.5M |
| `visx` | missing | No package named "visx" on npm | Claude, Gemini | 3 | – |
| `react-beautiful-dnd` | deprecated | react-beautiful-dnd is now deprecated. Context and options: https://github.com/atlassian/react-beautiful-dnd/issues/2672 | Claude, Gemini | 2 | 1.0M |
| `lucia` | deprecated | This package has been deprecated. Please see https://lucia-auth.com/lucia-v3/migrate. | Gemini | 2 | 276k |
| `draft-js` | archived | GitHub repository facebookarchive/draft-js is archived | Gemini | 3 | 530k |
| `remark` | dormant | No release for 3.1 years (repository still active) | ChatGPT, Claude | 2 | 4.2M |
| `minimist` | dormant | No release for 3.7 years (repository still active) | ChatGPT, Gemini | 3 | 100.6M |
| `node-fetch` | dormant | No release for 3.2 years (repository still active) | Gemini | 2 | 121.2M |
| `apollo-client` | dormant | No release for 6.4 years (repository still active) | Gemini | 3 | 243k |
| `@auth/nextjs` | dormant | No release for 3.5 years (repository still active) | Gemini | 2 | 881 |
| `showdown` | dormant | No release for 4.5 years (repository still active) | Gemini | 3 | 691k |
| `microbundle` | dormant | No release for 4.2 years (repository still active) | Gemini | 3 | 70k |
