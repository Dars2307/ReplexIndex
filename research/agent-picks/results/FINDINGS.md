# Findings (22 Oct 2026)

Full numbers: `COMPARISON.md`. ChatGPT, Claude and Gemini chat apps, web search
off, 26 everyday tasks × top 3 picks, 2 runs each (468 picks), every pick
checked against npm / PyPI / GitHub.

## What we found

1. **First picks are almost always healthy.** 1 dead first pick in 156
   (ChatGPT once put `pdf-lib`, unreleased for 5 years, first for PDFs).
2. **5–7% of all picks are dead**: abandoned, deprecated, archived or made up.
   They sit in 2nd and 3rd place.
3. **All three AIs share the same blind spots.** Every one recommends
   `bunyan` (no release in 5.8 years), `react-dnd` (4.5 years) and
   `uWebSockets.js` (not installable from npm under that name). The mistakes
   come from shared training data, not from one model.
4. **Wrong install names happen.** `visx` doesn't exist on npm (it's
   `@visx/visx`), from Claude and Gemini. Someone could register that name.
5. **Gemini is the most dated and least consistent.** It suggested deprecated
   `lucia` in both runs, archived `draft-js`, `apollo-client` (renamed in 2020),
   `@auth/nextjs` and `node-fetch`; only 58% of its tasks got the same three
   picks twice. ChatGPT was 96% consistent, Claude 69%.

## Visibility differs by AI: the library-maker angle

Who gets recommended for "add authentication to a Next.js app":

| | ChatGPT | Claude | Gemini |
|---|---|---|---|
| Picks | next-auth, Clerk, Supabase | next-auth, Clerk, Better Auth | next-auth, lucia (deprecated), @auth/nextjs / iron-session |

Clerk is invisible to Gemini; Better Auth only appears in Claude; Gemini
still sends people to a deprecated library. That per-company view is the
report a developer-tools company would care about.

## Caveats

- Popular tasks only; models are strongest there. The long tail is untested.
- "Dormant" also flags finished libraries (`minimist`, `remark`); only
  `apollo-client`, `@auth/nextjs` and `node-fetch` are clearly outdated.
- Chat apps on one date, 2 runs each; answers vary run to run.
