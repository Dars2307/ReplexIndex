# Chat prompt, round 2 (less common tasks)

Same rules as round 1: paste everything between the two lines into a **new
chat**, **web search off**, **twice per app**. Save each reply as
`results/raw/<app>-hard-<1|2>.txt` (for example `results/raw/claude-hard-1.txt`),
then:

```bash
GITHUB_TOKEN=$(gh auth token) npx tsx run.ts --from results/raw/claude-hard-1.txt --label claude-hard-1
npx tsx compare.ts --round hard
```

---

I'm setting up a few projects and need to pick packages quickly. For each task below, tell me which package you'd install: your top 3, best first, using exact npm or PyPI package names. Answer from what you already know, without searching the web.

Reply with only this JSON, no other text, one object per task, keeping each id exactly as given:

[{"id": "node-xlsx", "picks": ["first", "second", "third"]}, ...]

Tasks:
node-xlsx (npm): Read and write Excel .xlsx files in Node.js
node-images (npm): Resize and convert images on a Node.js server
node-email (npm): Send transactional email from a Node.js app
express-rate-limit (npm): Rate-limit requests to an Express API
express-uploads (npm): Handle multipart file uploads in an Express API
node-csv (npm): Parse and write CSV files in Node.js
json-diff (npm): Compute the difference between two JSON objects in JavaScript
react-virtual-list (npm): Render a virtualised list of 100,000 rows in React
react-date-picker (npm): Add a date range picker to a React app
react-toasts (npm): Show toast notifications in a React app
react-code-highlight (npm): Syntax-highlight code blocks in a React app
react-maps (npm): Show an interactive map with markers in a React app
react-flow-diagram (npm): Build a node-based flow diagram editor in React
react-i18n (npm): Translate a React app into several languages
js-fuzzy-search (npm): Fuzzy-search a list of items in the browser
node-yaml (npm): Parse and write YAML in Node.js
node-cron (npm): Run scheduled cron jobs inside a Node.js process
js-unique-ids (npm): Generate short, collision-resistant unique IDs in JavaScript
node-password-hash (npm): Hash and verify user passwords in Node.js
node-docx (npm): Extract text from Word .docx files in Node.js
react-image-crop (npm): Let users crop an uploaded image in React
monorepo-runner (npm): Run builds and tests across a JavaScript monorepo with caching
py-pdf-text (PyPI): Extract text from PDF files in Python
py-fuzzy-match (PyPI): Fuzzy string matching in Python
py-retry (PyPI): Retry failing function calls with exponential backoff in Python
py-scheduler (PyPI): Schedule periodic background jobs in a Python app
py-scrape-js (PyPI): Scrape JavaScript-rendered pages in Python
py-excel (PyPI): Read and write Excel files in Python
py-async-postgres (PyPI): Query PostgreSQL asynchronously from Python
py-mock-http (PyPI): Mock HTTP requests in Python tests

---
