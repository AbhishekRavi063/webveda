import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createStore } from './store/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3001;
const DB_PATH = process.env.DB_PATH || path.resolve(here, '../data/app.db');
const STATIC_DIR = process.env.STATIC_DIR || path.resolve(here, '../../client/dist');

const store = createStore({ dbPath: DB_PATH });
const app = createApp({ store, staticDir: STATIC_DIR });

const server = app.listen(PORT, () => {
  const where = store.kind === 'postgres' ? 'Postgres (DATABASE_URL)' : DB_PATH;
  console.log(`Server listening on http://localhost:${PORT} (db: ${where})`);
});

function shutdown() {
  server.close(async () => {
    await store.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Vercel can also use the app directly.
export default app;
