import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { SEED_BOOKS } from './seed.js';

/**
 * SQLite store, used locally, in Docker and in tests.
 * Seeding uses INSERT OR IGNORE, so a restart never resets saved data.
 */
export function createSqliteStore(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id       TEXT PRIMARY KEY,
      title    TEXT NOT NULL,
      list     TEXT NOT NULL CHECK (list IN ('fiction', 'nonfiction')),
      position INTEGER NOT NULL,
      read     INTEGER NOT NULL DEFAULT 0 CHECK (read IN (0, 1))
    );
    CREATE TABLE IF NOT EXISTS video_progress (
      id         INTEGER PRIMARY KEY CHECK (id = 1),
      position   REAL NOT NULL DEFAULT 0,
      updated_at TEXT
    );
  `);

  const insertBook = db.prepare(
    'INSERT OR IGNORE INTO books (id, title, list, position, read) VALUES (@id, @title, @list, @position, 0)'
  );
  db.transaction(() => {
    for (const book of SEED_BOOKS) insertBook.run(book);
    db.prepare('INSERT OR IGNORE INTO video_progress (id, position) VALUES (1, 0)').run();
  })();

  const q = {
    all: db.prepare("SELECT * FROM books ORDER BY CASE list WHEN 'fiction' THEN 0 ELSE 1 END, position"),
    get: db.prepare('SELECT * FROM books WHERE id = ?'),
    setRead: db.prepare('UPDATE books SET read = ? WHERE id = ?'),
    getProgress: db.prepare('SELECT position, updated_at FROM video_progress WHERE id = 1'),
    setProgress: db.prepare("UPDATE video_progress SET position = ?, updated_at = datetime('now') WHERE id = 1"),
  };

  const toBook = (r) => r && { id: r.id, title: r.title, list: r.list, read: r.read === 1 };
  // SQLite stores "YYYY-MM-DD HH:MM:SS" in UTC; return ISO like Postgres does.
  const toProgress = (r) => ({
    position: r.position,
    updatedAt: r.updated_at ? new Date(`${r.updated_at.replace(' ', 'T')}Z`).toISOString() : null,
  });

  return {
    async listBooks() {
      return q.all.all().map(toBook);
    },
    async getBook(id) {
      return toBook(q.get.get(id)) ?? null;
    },
    async setRead(id, read) {
      q.setRead.run(read ? 1 : 0, id);
      return toBook(q.get.get(id));
    },
    async getProgress() {
      return toProgress(q.getProgress.get());
    },
    async setProgress(position) {
      q.setProgress.run(position);
      return toProgress(q.getProgress.get());
    },
    async close() {
      db.close();
    },
  };
}
