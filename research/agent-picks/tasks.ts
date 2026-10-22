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
