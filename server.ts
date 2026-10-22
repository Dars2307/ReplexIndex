import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app } from './server/app.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;

async function start() {
  if (process.env.NODE_ENV === 'production' || process.argv.includes('--prod')) {
    app.use(express.static(path.join(root, 'dist'), { maxAge: '1h', index: false }));
    app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  app.listen(port, () => console.log(`Replex running at http://localhost:${port}`));
}

start().catch((err) => {
  console.error('Failed to start Replex', err);
  process.exit(1);
});
