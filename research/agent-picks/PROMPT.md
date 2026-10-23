# Chat prompt

Paste everything between the two lines into a **new chat** in ChatGPT, Gemini
and Claude. Turn **web search off** first (it must answer from memory, like an
agent picking a package mid-task). Do it **twice per app**, each time in a new
chat. Save each reply as `results/raw/<app>-<1|2>.txt` (for example
`results/raw/chatgpt-1.txt`), then run:

```bash
GITHUB_TOKEN=$(gh auth token) npx tsx run.ts --from results/raw/chatgpt-1.txt --label chatgpt-chat-1
```

---

I'm setting up a few projects and need to pick packages quickly. For each task below, tell me which package you'd install: your top 3, best first, using exact npm or PyPI package names. Answer from what you already know, without searching the web.

Reply with only this JSON, no other text, one object per task, keeping each id exactly as given:

[{"id": "node-http", "picks": ["first", "second", "third"]}, ...]

Tasks:
node-http (npm): Make HTTP requests from a Node.js backend
js-dates (npm): Parse, format and do arithmetic on dates in JavaScript
ts-validation (npm): Validate API request bodies with a schema in TypeScript
ts-orm (npm): Talk to a PostgreSQL database from TypeScript with an ORM or query builder
react-state (npm): Manage global client state in a React app
react-data (npm): Fetch and cache server data in a React app
react-forms (npm): Build forms with validation in React
ts-unit-tests (npm): Write unit tests for a TypeScript project
e2e-tests (npm): Write end-to-end browser tests for a web app
lib-bundler (npm): Bundle a TypeScript library for publishing to npm
next-auth (npm): Add user authentication to a Next.js app
node-queue (npm): Run background jobs with retries in a Node.js app
node-logging (npm): Structured logging in a Node.js server
node-cli-args (npm): Parse command-line arguments for a Node.js CLI tool
node-pdf (npm): Generate PDF documents in Node.js
react-charts (npm): Draw charts in a React app
react-rich-text (npm): Add a rich text editor to a React app
react-dnd (npm): Add drag and drop to a React app
md-to-html (npm): Convert Markdown to HTML in Node.js
node-scraping (npm): Scrape JavaScript-rendered web pages from Node.js
node-websocket (npm): Run a WebSocket server in Node.js
py-http (PyPI): Make HTTP requests in Python, including async
py-validation (PyPI): Validate and parse data into typed objects in Python
py-web-api (PyPI): Build a JSON web API in Python
py-cli (PyPI): Build a command-line tool in Python
py-dataframes (PyPI): Load and analyse a large CSV as a dataframe in Python

---
