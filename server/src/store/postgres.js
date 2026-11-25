import { SEED_BOOKS } from './seed.js';

/**
 * Postgres store, used on Vercel with Neon.
 *
 * `query(text, params)` must resolve to an array of rows. In production it is
 * Neon's HTTP driver; in tests it is PGlite (Postgres running in-process).
 *
 * Tables are created and seeded on first use. ON CONFLICT DO NOTHING means
 * a cold start or redeploy never resets saved data.
 */
export function createPostgresStore(query) {
  let ready;

  async function setup() {
    await query(`
      CREATE TABLE IF NOT EXISTS books (
        id       TEXT PRIMARY KEY,
        title    TEXT NOT NULL,
        list     TEXT NOT NULL CHECK (list IN ('fiction', 'nonfiction')),
        position INTEGER NOT NULL,
        read     BOOLEAN NOT NULL DEFAULT FALSE
      )`);
    await query(`
      CREATE TABLE IF NOT EXISTS video_progress (
        id         INTEGER PRIMARY KEY CHECK (id = 1),
        position   DOUBLE PRECISION NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ
      )`);

    const values = SEED_BOOKS.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, FALSE)`);
    const params = SEED_BOOKS.flatMap((b) => [b.id, b.title, b.list, b.position]);
    await query(
      `INSERT INTO books (id, title, list, position, read) VALUES ${values.join(', ')} ON CONFLICT (id) DO NOTHING`,
      params
    );
    await query('INSERT INTO video_progress (id, position) VALUES (1, 0) ON CONFLICT (id) DO NOTHING');
  }

  // Run setup once per process. If two cold starts race on CREATE TABLE,
  // one may fail; retrying once is enough because the tables then exist.
  function init() {
    ready ??= setup()
      .catch(() => setup())
      .catch((err) => {
        ready = undefined; // let the next request try again
        throw err;
      });
    return ready;
  }

  const toBook = (r) => r && { id: r.id, title: r.title, list: r.list, read: r.read === true };
  const toProgress = (r) => ({
    position: Number(r.position),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
  });

  return {
    async listBooks() {
      await init();
      const rows = await query("SELECT * FROM books ORDER BY CASE list WHEN 'fiction' THEN 0 ELSE 1 END, position");
      return rows.map(toBook);
    },
    async getBook(id) {
      await init();
      const rows = await query('SELECT * FROM books WHERE id = $1', [id]);
      return toBook(rows[0]) ?? null;
    },
    async setRead(id, read) {
      await init();
      const rows = await query('UPDATE books SET read = $1 WHERE id = $2 RETURNING *', [read, id]);
      return toBook(rows[0]) ?? null;
    },
    async getProgress() {
      await init();
      const rows = await query('SELECT position, updated_at FROM video_progress WHERE id = 1');
      return toProgress(rows[0]);
    },
    async setProgress(position) {
      await init();
      const rows = await query(
        'UPDATE video_progress SET position = $1, updated_at = now() WHERE id = 1 RETURNING position, updated_at',
        [position]
      );
      return toProgress(rows[0]);
    },
    async close() {},
  };
}
