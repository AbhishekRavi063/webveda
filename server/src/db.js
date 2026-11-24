import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

// Fixed IDs so the API and tests can refer to books by a stable, readable key.
export const SEED_BOOKS = [
  { id: 'the-hobbit', title: 'The Hobbit', list: 'fiction', position: 1 },
  { id: 'matilda', title: 'Matilda', list: 'fiction', position: 2 },
  { id: 'the-secret-garden', title: 'The Secret Garden', list: 'fiction', position: 3 },
  { id: 'the-story-of-my-life', title: 'The Story of My Life', list: 'nonfiction', position: 1 },
  { id: 'a-brief-history-of-time', title: 'A Brief History of Time', list: 'nonfiction', position: 2 },
  { id: 'the-diary-of-a-young-girl', title: 'The Diary of a Young Girl', list: 'nonfiction', position: 3 },
];

/**
 * Opens (or creates) the SQLite database, creates tables and seeds the six
 * books as unread. Seeding uses INSERT OR IGNORE, so restarting the server
 * never resets a status the reader already saved.
 */
export function openDb(file) {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
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

  return db;
}
