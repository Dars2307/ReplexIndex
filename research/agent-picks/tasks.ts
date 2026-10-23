// Everyday tasks an AI coding agent picks a library for. Chosen where the
// ecosystem has moved in recent years, so stale knowledge would show.
export type Ecosystem = 'npm' | 'pypi';

export interface Task {
  id: string;
  ecosystem: Ecosystem;
  task: string;
}

export const TASKS: Task[] = [
  { id: 'node-http', ecosystem: 'npm', task: 'Make HTTP requests from a Node.js backend' },
  { id: 'js-dates', ecosystem: 'npm', task: 'Parse, format and do arithmetic on dates in JavaScript' },
  { id: 'ts-validation', ecosystem: 'npm', task: 'Validate API request bodies with a schema in TypeScript' },
  { id: 'ts-orm', ecosystem: 'npm', task: 'Talk to a PostgreSQL database from TypeScript with an ORM or query builder' },
  { id: 'react-state', ecosystem: 'npm', task: 'Manage global client state in a React app' },
  { id: 'react-data', ecosystem: 'npm', task: 'Fetch and cache server data in a React app' },
  { id: 'react-forms', ecosystem: 'npm', task: 'Build forms with validation in React' },
  { id: 'ts-unit-tests', ecosystem: 'npm', task: 'Write unit tests for a TypeScript project' },
  { id: 'e2e-tests', ecosystem: 'npm', task: 'Write end-to-end browser tests for a web app' },
  { id: 'lib-bundler', ecosystem: 'npm', task: 'Bundle a TypeScript library for publishing to npm' },
  { id: 'next-auth', ecosystem: 'npm', task: 'Add user authentication to a Next.js app' },
  { id: 'node-queue', ecosystem: 'npm', task: 'Run background jobs with retries in a Node.js app' },
  { id: 'node-logging', ecosystem: 'npm', task: 'Structured logging in a Node.js server' },
  { id: 'node-cli-args', ecosystem: 'npm', task: 'Parse command-line arguments for a Node.js CLI tool' },
  { id: 'node-pdf', ecosystem: 'npm', task: 'Generate PDF documents in Node.js' },
  { id: 'react-charts', ecosystem: 'npm', task: 'Draw charts in a React app' },
  { id: 'react-rich-text', ecosystem: 'npm', task: 'Add a rich text editor to a React app' },
  { id: 'react-dnd', ecosystem: 'npm', task: 'Add drag and drop to a React app' },
  { id: 'md-to-html', ecosystem: 'npm', task: 'Convert Markdown to HTML in Node.js' },
  { id: 'node-scraping', ecosystem: 'npm', task: 'Scrape JavaScript-rendered web pages from Node.js' },
  { id: 'node-websocket', ecosystem: 'npm', task: 'Run a WebSocket server in Node.js' },
  { id: 'py-http', ecosystem: 'pypi', task: 'Make HTTP requests in Python, including async' },
  { id: 'py-validation', ecosystem: 'pypi', task: 'Validate and parse data into typed objects in Python' },
  { id: 'py-web-api', ecosystem: 'pypi', task: 'Build a JSON web API in Python' },
  { id: 'py-cli', ecosystem: 'pypi', task: 'Build a command-line tool in Python' },
  { id: 'py-dataframes', ecosystem: 'pypi', task: 'Load and analyse a large CSV as a dataframe in Python' },
];

// Round 2: less common tasks, including ones where libraries were renamed,
// replaced by a successor, moved off the registry or abandoned.
export const HARD_TASKS: Task[] = [
  { id: 'node-xlsx', ecosystem: 'npm', task: 'Read and write Excel .xlsx files in Node.js' },
  { id: 'node-images', ecosystem: 'npm', task: 'Resize and convert images on a Node.js server' },
  { id: 'node-email', ecosystem: 'npm', task: 'Send transactional email from a Node.js app' },
  { id: 'express-rate-limit', ecosystem: 'npm', task: 'Rate-limit requests to an Express API' },
  { id: 'express-uploads', ecosystem: 'npm', task: 'Handle multipart file uploads in an Express API' },
  { id: 'node-csv', ecosystem: 'npm', task: 'Parse and write CSV files in Node.js' },
  { id: 'json-diff', ecosystem: 'npm', task: 'Compute the difference between two JSON objects in JavaScript' },
  { id: 'react-virtual-list', ecosystem: 'npm', task: 'Render a virtualised list of 100,000 rows in React' },
  { id: 'react-date-picker', ecosystem: 'npm', task: 'Add a date range picker to a React app' },
  { id: 'react-toasts', ecosystem: 'npm', task: 'Show toast notifications in a React app' },
  { id: 'react-code-highlight', ecosystem: 'npm', task: 'Syntax-highlight code blocks in a React app' },
  { id: 'react-maps', ecosystem: 'npm', task: 'Show an interactive map with markers in a React app' },
  { id: 'react-flow-diagram', ecosystem: 'npm', task: 'Build a node-based flow diagram editor in React' },
  { id: 'react-i18n', ecosystem: 'npm', task: 'Translate a React app into several languages' },
  { id: 'js-fuzzy-search', ecosystem: 'npm', task: 'Fuzzy-search a list of items in the browser' },
  { id: 'node-yaml', ecosystem: 'npm', task: 'Parse and write YAML in Node.js' },
  { id: 'node-cron', ecosystem: 'npm', task: 'Run scheduled cron jobs inside a Node.js process' },
  { id: 'js-unique-ids', ecosystem: 'npm', task: 'Generate short, collision-resistant unique IDs in JavaScript' },
  { id: 'node-password-hash', ecosystem: 'npm', task: 'Hash and verify user passwords in Node.js' },
  { id: 'node-docx', ecosystem: 'npm', task: 'Extract text from Word .docx files in Node.js' },
  { id: 'react-image-crop', ecosystem: 'npm', task: 'Let users crop an uploaded image in React' },
  { id: 'monorepo-runner', ecosystem: 'npm', task: 'Run builds and tests across a JavaScript monorepo with caching' },
  { id: 'py-pdf-text', ecosystem: 'pypi', task: 'Extract text from PDF files in Python' },
  { id: 'py-fuzzy-match', ecosystem: 'pypi', task: 'Fuzzy string matching in Python' },
  { id: 'py-retry', ecosystem: 'pypi', task: 'Retry failing function calls with exponential backoff in Python' },
  { id: 'py-scheduler', ecosystem: 'pypi', task: 'Schedule periodic background jobs in a Python app' },
  { id: 'py-scrape-js', ecosystem: 'pypi', task: 'Scrape JavaScript-rendered pages in Python' },
  { id: 'py-excel', ecosystem: 'pypi', task: 'Read and write Excel files in Python' },
  { id: 'py-async-postgres', ecosystem: 'pypi', task: 'Query PostgreSQL asynchronously from Python' },
  { id: 'py-mock-http', ecosystem: 'pypi', task: 'Mock HTTP requests in Python tests' },
];

export const ALL_TASKS = [...TASKS, ...HARD_TASKS];
