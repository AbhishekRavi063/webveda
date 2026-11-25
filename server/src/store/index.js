import { neon } from '@neondatabase/serverless';
import { createPostgresStore } from './postgres.js';
import { createSqliteStore } from './sqlite.js';

/**
 * Picks the database:
 * - DATABASE_URL (or POSTGRES_URL) set, as on Vercel with Neon -> Postgres
 * - otherwise -> SQLite file at dbPath (local, Docker, tests)
 */
export function createStore({ dbPath }) {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const sql = neon(url);
    return { kind: 'postgres', ...createPostgresStore((text, params) => sql.query(text, params)) };
  }
  return { kind: 'sqlite', ...createSqliteStore(dbPath) };
}
