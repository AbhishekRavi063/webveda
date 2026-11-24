import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { createApp } from './app.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3001;
const DB_PATH = process.env.DB_PATH || path.resolve(here, '../data/app.db');
const STATIC_DIR = process.env.STATIC_DIR || path.resolve(here, '../../client/dist');

const db = openDb(DB_PATH);
const app = createApp({ db, staticDir: STATIC_DIR });

const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT} (db: ${DB_PATH})`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
