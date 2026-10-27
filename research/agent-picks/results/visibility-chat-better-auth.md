# How AI assistants see Better Auth

6 chat runs (web search off) across ChatGPT, Claude, Gemini; tasks: next-auth. Each cell: answers that recommend the brand (top 3) out of all answers, and how many put it first.

| Brand | ChatGPT | Claude | Gemini |
|---|---|---|---|
| Auth.js (NextAuth) | 2 of 2 · 2 first | 2 of 2 · 2 first | 2 of 2 · 2 first |
| Clerk | 2 of 2 | 2 of 2 | 0 of 2 |
| Supabase | 2 of 2 | 0 of 2 | 0 of 2 |
| **Better Auth** | 0 of 2 | 2 of 2 | 0 of 2 |
| Lucia | 0 of 2 | 0 of 2 | 2 of 2 |
| iron-session | 0 of 2 | 0 of 2 | 1 of 2 |

## Better Auth, task by task

| Task | ChatGPT | Claude | Gemini |
|---|---|---|---|
| Add user authentication to a Next.js app | —, — | #3, #2 | —, — |

"—" means not recommended in that answer (one entry per run).

## Recommended instead of Better Auth

- **ChatGPT:** Auth.js (NextAuth) (2), Clerk (2), Supabase (2)
- **Claude:** always recommends Better Auth
- **Gemini:** Auth.js (NextAuth) (2), Lucia (2), iron-session (1)

## Dead or broken recommendations in this set

| Assistant | Task | Package | Verdict | Evidence |
|---|---|---|---|---|
| Gemini | Add user authentication to a Next.js app | `lucia` | deprecated | This package has been deprecated. Please see https://lucia-auth.com/lucia-v3/migrate. |

## Method and limits

- Chat apps with web search off, the same wording for every assistant, answers checked against npm / PyPI / GitHub.
- Small samples: treat differences of one or two answers as noise.
- Brands group a company's packages (for example every `@clerk/*` package counts as Clerk).
