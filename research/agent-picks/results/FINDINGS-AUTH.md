# Auth deep dive: findings (23 Oct 2026)

12 authentication tasks × 2 runs × 3 assistants = 72 answers, 216 picks. Runs
done in the user's own ChatGPT (temporary chat), Gemini (temporary chat) and
Claude (incognito) accounts with the prompt in `PROMPT-AUTH.md`; no web search
was used. Every pick checked against npm and GitHub. Full tables:
`visibility-auth.md` and the per-brand `visibility-auth-*.md` files.

## Brand visibility (answers recommending the brand, out of 24 per assistant)

| Brand | ChatGPT | Claude | Gemini |
|---|---|---|---|
| Clerk | 8 (3 first) | 9 (2 first) | 9 (4 first) |
| Better Auth | 12 (7 first) | 12 (2 first) | **0** |
| Auth.js (NextAuth) | 6 (2 first) | 7 (4 first) | 6 (4 first) |
| Supabase | 8 | **0** | 2 |
| Auth0 | 3 (2 first) | 2 (1 first) | 2 (2 first) |
| Lucia (deprecated) | 0 | 2 | **6 (2 first)** |

## What stands out

1. **All three assistants recommend Clerk's deprecated packages.**
   `@clerk/clerk-react` and `@clerk/clerk-expo` were renamed to `@clerk/react`
   and `@clerk/expo` (npm's deprecation notice says so). Every assistant still
   gives the old names. Clerk is visible, but under names that now warn.
2. **Better Auth depends entirely on which assistant you ask:** first choice in
   7 of ChatGPT's answers, recommended in half of Claude's, never in Gemini's.
3. **Gemini still sends people to deprecated Lucia**, in 6 of 24 answers, twice
   as the first pick (SvelteKit, magic links).
4. **Supabase Auth is only visible in ChatGPT** (8 of 24); Claude never names it.
5. **Old, unmaintained defaults persist for low-level tasks:** `speakeasy` (no
   release for 10.7 years) for TOTP in every assistant, `passport-github2` (6.6
   years) for GitHub login, and `arctic`, which npm now marks "no longer
   supported".
6. **Made-up names still appear:** `webauthn4j` (a Java library, not an npm
   package) from ChatGPT and `svelte-kit-auth` from Gemini.

## Caveats

- 2 runs per assistant: differences of one or two answers are noise; the
  patterns above repeat in both runs.
- ChatGPT's temporary chat notes it "can reference memory and custom
  instructions" in this workspace, so its answers may be slightly personalised.
- Claude ran on Opus 5 (High) in the chat app; ChatGPT and Gemini on their
  default chat models.
