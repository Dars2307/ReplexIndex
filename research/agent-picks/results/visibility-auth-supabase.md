# How AI assistants see Supabase

6 chat runs (web search off) across ChatGPT, Claude, Gemini; all auth tasks. Each cell: answers that recommend the brand (top 3) out of all answers, and how many put it first.

| Brand | ChatGPT | Claude | Gemini |
|---|---|---|---|
| Clerk | 8 of 24 · 3 first | 9 of 24 · 2 first | 9 of 24 · 4 first |
| Better Auth | 12 of 24 · 7 first | 12 of 24 · 2 first | 0 of 24 |
| Auth.js (NextAuth) | 6 of 24 · 2 first | 7 of 24 · 4 first | 6 of 24 · 4 first |
| Passport | 4 of 24 · 1 first | 4 of 24 · 4 first | 4 of 24 · 4 first |
| **Supabase** | 8 of 24 | 0 of 24 | 2 of 24 |
| express-session | 4 of 24 · 2 first | 2 of 24 · 2 first | 3 of 24 · 2 first |
| Lucia | 0 of 24 | 2 of 24 | 6 of 24 · 2 first |
| Auth0 | 3 of 24 · 2 first | 2 of 24 · 1 first | 2 of 24 · 2 first |
| arctic | 2 of 24 · 1 first | 2 of 24 | 2 of 24 |
| SimpleWebAuthn | 2 of 24 · 2 first | 2 of 24 · 2 first | 2 of 24 · 2 first |
| jose | 2 of 24 · 2 first | 2 of 24 · 2 first | 2 of 24 |
| jsonwebtoken | 2 of 24 | 2 of 24 | 2 of 24 · 2 first |
| speakeasy | 2 of 24 | 2 of 24 | 2 of 24 |
| expo-auth-session | 2 of 24 | 2 of 24 · 2 first | 2 of 24 |
| cookie-session | 2 of 24 | 1 of 24 | 2 of 24 |
| iron-session | 2 of 24 | 2 of 24 | 0 of 24 |
| otplib | 2 of 24 · 2 first | 1 of 24 · 1 first | 1 of 24 · 1 first |
| bcrypt | 0 of 24 | 2 of 24 | 2 of 24 |
| grant | 2 of 24 | 1 of 24 | 0 of 24 |
| WorkOS | 1 of 24 | 2 of 24 | 0 of 24 |
| fast-jwt | 2 of 24 | 1 of 24 | 0 of 24 |
| otpauth | 1 of 24 | 1 of 24 · 1 first | 1 of 24 · 1 first |
| express-jwt | 0 of 24 | 1 of 24 | 2 of 24 |
| qrcode | 0 of 24 | 2 of 24 | 1 of 24 |
| supertokens-node | 0 of 24 | 0 of 24 | 3 of 24 |

## Supabase, task by task

| Task | ChatGPT | Claude | Gemini |
|---|---|---|---|
| Add sign-in and sign-up to a Next.js App Router app | —, — | —, — | #3, — |
| Add login to a React single-page app that talks to a separate API | #3, #3 | —, — | —, — |
| Add email and password login to an Express API | —, — | —, — | —, — |
| Let users sign in with GitHub in a Node.js web app | —, — | —, — | —, — |
| Add passwordless magic-link email sign-in to a web app | #2, #3 | —, — | —, — |
| Add passkey (WebAuthn) sign-in to a web app | —, — | —, — | —, — |
| Multi-tenant SaaS authentication with organizations, invites and roles | —, — | —, — | —, — |
| Issue and verify JWTs for a REST API in Node.js | —, — | —, — | —, — |
| Cookie-based login sessions for a Node.js server | —, — | —, — | —, — |
| Add TOTP two-factor authentication to a Node.js app | —, — | —, — | —, — |
| Add authentication to a React Native (Expo) app | #3, #3 | —, — | #3, — |
| Add authentication to a SvelteKit app | #3, #3 | —, — | —, — |

"—" means not recommended in that answer (one entry per run).

## Recommended instead of Supabase

- **ChatGPT:** Better Auth (8), Clerk (4), Passport (4), express-session (4), Auth.js (NextAuth) (2), arctic (2)
- **Claude:** Better Auth (12), Clerk (9), Auth.js (NextAuth) (7), Passport (4), Auth0 (2), bcrypt (2)
- **Gemini:** Clerk (7), Lucia (6), Auth.js (NextAuth) (5), Passport (4), express-session (3), supertokens-node (3)

## Dead or broken recommendations in this set

| Assistant | Task | Package | Verdict | Evidence |
|---|---|---|---|---|
| ChatGPT | Add login to a React single-page app that talks to a separate API | `@clerk/clerk-react` | deprecated | This package is no longer supported. Please use @clerk/react instead. See the upgrade guide for more info: https://clerk.com/docs/guides/dev |
| ChatGPT | Add email and password login to an Express API | `passport` | stale | Last release 2.9 years ago, last commit 2.2 years ago |
| ChatGPT | Let users sign in with GitHub in a Node.js web app | `arctic` | deprecated | Package no longer supported. Contact Support at https://www.npmjs.com/support for more info. |
| ChatGPT | Let users sign in with GitHub in a Node.js web app | `passport-github2` | stale | Last release 6.6 years ago, last commit 2.9 years ago |
| ChatGPT | Add passkey (WebAuthn) sign-in to a web app | `webauthn4j` | missing | No package named "webauthn4j" on npm |
| ChatGPT | Add TOTP two-factor authentication to a Node.js app | `speakeasy` | stale | Last release 10.7 years ago, last commit 3.1 years ago |
| ChatGPT | Add TOTP two-factor authentication to a Node.js app | `node-2fa` | stale | Last release 4.9 years ago, last commit 3.8 years ago |
| ChatGPT | Add authentication to a React Native (Expo) app | `@clerk/clerk-expo` | deprecated | @clerk/clerk-expo is deprecated. Migrate to @clerk/expo by following the Core 3 upgrade guide https://clerk.com/docs/guides/development/upgr |
| ChatGPT | Add passkey (WebAuthn) sign-in to a web app | `webauthn` | stale | Last release 6.9 years ago, last commit 3.8 years ago |
| Claude | Add login to a React single-page app that talks to a separate API | `@clerk/clerk-react` | deprecated | This package is no longer supported. Please use @clerk/react instead. See the upgrade guide for more info: https://clerk.com/docs/guides/dev |
| Claude | Add email and password login to an Express API | `passport-local` | stale | Last release 12.6 years ago, last commit 2.7 years ago |
| Claude | Let users sign in with GitHub in a Node.js web app | `passport-github2` | stale | Last release 6.6 years ago, last commit 2.9 years ago |
| Claude | Let users sign in with GitHub in a Node.js web app | `arctic` | deprecated | Package no longer supported. Contact Support at https://www.npmjs.com/support for more info. |
| Claude | Add TOTP two-factor authentication to a Node.js app | `speakeasy` | stale | Last release 10.7 years ago, last commit 3.1 years ago |
| Claude | Add TOTP two-factor authentication to a Node.js app | `qrcode` | stale | Last release 2.2 years ago, last commit 2.2 years ago |
| Claude | Add authentication to a React Native (Expo) app | `@clerk/clerk-expo` | deprecated | @clerk/clerk-expo is deprecated. Migrate to @clerk/expo by following the Core 3 upgrade guide https://clerk.com/docs/guides/development/upgr |
| Claude | Add authentication to a SvelteKit app | `lucia` | deprecated | This package has been deprecated. Please see https://lucia-auth.com/lucia-v3/migrate. |
| Gemini | Add login to a React single-page app that talks to a separate API | `@clerk/clerk-react` | deprecated | This package is no longer supported. Please use @clerk/react instead. See the upgrade guide for more info: https://clerk.com/docs/guides/dev |
| Gemini | Add email and password login to an Express API | `passport` | stale | Last release 2.9 years ago, last commit 2.2 years ago |
| Gemini | Let users sign in with GitHub in a Node.js web app | `passport-github` | stale | Last release 10.7 years ago, last commit 3.2 years ago |
| Gemini | Let users sign in with GitHub in a Node.js web app | `passport` | stale | Last release 2.9 years ago, last commit 2.2 years ago |
| Gemini | Let users sign in with GitHub in a Node.js web app | `arctic` | deprecated | Package no longer supported. Contact Support at https://www.npmjs.com/support for more info. |
| Gemini | Add passwordless magic-link email sign-in to a web app | `lucia` | deprecated | This package has been deprecated. Please see https://lucia-auth.com/lucia-v3/migrate. |
| Gemini | Add passkey (WebAuthn) sign-in to a web app | `lucia` | deprecated | This package has been deprecated. Please see https://lucia-auth.com/lucia-v3/migrate. |
| Gemini | Cookie-based login sessions for a Node.js server | `express-mysql-session` | stale | Last release 2.3 years ago, last commit 2.3 years ago |
| Gemini | Add TOTP two-factor authentication to a Node.js app | `speakeasy` | stale | Last release 10.7 years ago, last commit 3.1 years ago |
| Gemini | Add TOTP two-factor authentication to a Node.js app | `notp` | stale | Last release 12.0 years ago, last commit 3.4 years ago |
| Gemini | Add authentication to a React Native (Expo) app | `@clerk/clerk-expo` | deprecated | @clerk/clerk-expo is deprecated. Migrate to @clerk/expo by following the Core 3 upgrade guide https://clerk.com/docs/guides/development/upgr |
| Gemini | Add authentication to a SvelteKit app | `lucia` | deprecated | This package has been deprecated. Please see https://lucia-auth.com/lucia-v3/migrate. |
| Gemini | Add authentication to a SvelteKit app | `svelte-kit-auth` | missing | No package named "svelte-kit-auth" on npm |
| Gemini | Add sign-in and sign-up to a Next.js App Router app | `lucia` | deprecated | This package has been deprecated. Please see https://lucia-auth.com/lucia-v3/migrate. |
| Gemini | Add email and password login to an Express API | `passport-local` | stale | Last release 12.6 years ago, last commit 2.7 years ago |
| Gemini | Let users sign in with GitHub in a Node.js web app | `passport-github2` | stale | Last release 6.6 years ago, last commit 2.9 years ago |
| Gemini | Add TOTP two-factor authentication to a Node.js app | `qrcode` | stale | Last release 2.2 years ago, last commit 2.2 years ago |

## Method and limits

- Chat apps with web search off, the same wording for every assistant, answers checked against npm / PyPI / GitHub.
- Small samples: treat differences of one or two answers as noise.
- Brands group a company's packages (for example every `@clerk/*` package counts as Clerk).
