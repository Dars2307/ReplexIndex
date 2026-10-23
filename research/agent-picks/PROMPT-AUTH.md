# Chat prompt, auth deep dive

Measures which login and sign-up libraries each AI recommends across 12 realistic
requests, for "how AIs see your library" reports. Same rules as before: paste
everything between the two lines into a **new chat**, **web search off**,
**twice per app**. Save each reply as `results/raw/<app>-auth-<1|2>.txt`, then:

```bash
GITHUB_TOKEN=$(gh auth token) npx tsx run.ts --from results/raw/claude-auth-1.txt --label claude-auth-1
npx tsx visibility.ts --round auth
npx tsx visibility.ts --round auth --brand "Clerk"
```

---

I'm setting up a few projects and need to pick packages quickly. For each task below, tell me which package you'd install: your top 3, best first, using exact npm package names. Answer from what you already know, without searching the web.

Reply with only this JSON, no other text, one object per task, keeping each id exactly as given:

[{"id": "auth-next-app", "picks": ["first", "second", "third"]}, ...]

Tasks:
auth-next-app (npm): Add sign-in and sign-up to a Next.js App Router app
auth-react-spa (npm): Add login to a React single-page app that talks to a separate API
auth-express-password (npm): Add email and password login to an Express API
auth-github-oauth (npm): Let users sign in with GitHub in a Node.js web app
auth-magic-link (npm): Add passwordless magic-link email sign-in to a web app
auth-passkeys (npm): Add passkey (WebAuthn) sign-in to a web app
auth-saas-orgs (npm): Multi-tenant SaaS authentication with organizations, invites and roles
auth-jwt-api (npm): Issue and verify JWTs for a REST API in Node.js
auth-sessions (npm): Cookie-based login sessions for a Node.js server
auth-2fa (npm): Add TOTP two-factor authentication to a Node.js app
auth-expo (npm): Add authentication to a React Native (Expo) app
auth-sveltekit (npm): Add authentication to a SvelteKit app

---
