import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createPostgresStore } from '../src/store/postgres.js';
import { createSqliteStore } from '../src/store/sqlite.js';

// The same tests run against both databases:
// SQLite (local / Docker) and Postgres (Vercel + Neon, here via PGlite).
const backends = {
  sqlite: {
    async open(dir) {
      return createSqliteStore(path.join(dir, 'test.db'));
    },
  },
  postgres: {
    async open(dir) {
      const pg = new PGlite(path.join(dir, 'pg'));
      const store = createPostgresStore((text, params) => pg.query(text, params).then((r) => r.rows));
      return { ...store, close: () => pg.close() };
    },
  },
};

describe.each(Object.keys(backends))('%s', (backendName) => {
  const backend = backends[backendName];
  let tmpDir;
  let store;
  let app;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rct-'));
    store = await backend.open(tmpDir);
    app = createApp({ store });
  });

  afterEach(async () => {
    await store.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('GET /api/books', () => {
    it('starts with three unread books in each list', async () => {
      const res = await request(app).get('/api/books').expect(200);
      expect(res.body).toHaveLength(6);
      const fiction = res.body.filter((b) => b.list === 'fiction');
      const nonfiction = res.body.filter((b) => b.list === 'nonfiction');
      expect(fiction.map((b) => b.title)).toEqual(['The Hobbit', 'Matilda', 'The Secret Garden']);
      expect(nonfiction).toHaveLength(3);
      expect(res.body.every((b) => b.read === false)).toBe(true);
    });
  });

  describe('PUT /api/books/:id', () => {
    it('marks a book as read and unread', async () => {
      let res = await request(app).put('/api/books/matilda').send({ read: true }).expect(200);
      expect(res.body).toMatchObject({ id: 'matilda', read: true });
      res = await request(app).put('/api/books/matilda').send({ read: false }).expect(200);
      expect(res.body.read).toBe(false);
    });

    it('is idempotent: the same update twice leaves the same status', async () => {
      const first = await request(app).put('/api/books/the-hobbit').send({ read: true }).expect(200);
      const second = await request(app).put('/api/books/the-hobbit').send({ read: true }).expect(200);
      expect(second.body).toEqual(first.body);
      const all = await request(app).get('/api/books');
      expect(all.body.find((b) => b.id === 'the-hobbit').read).toBe(true);
    });

    it('rejects unknown book ids with 404', async () => {
      const res = await request(app).put('/api/books/not-a-book').send({ read: true }).expect(404);
      expect(res.body.error).toMatch(/unknown book/i);
    });

    it.each([
      ['missing status', {}],
      ['string "true"', { read: 'true' }],
      ['number 1', { read: 1 }],
      ['null', { read: null }],
    ])('rejects %s with 400 and does not change the book', async (_label, body) => {
      const res = await request(app).put('/api/books/matilda').send(body).expect(400);
      expect(res.body.error).toBeTruthy();
      const all = await request(app).get('/api/books');
      expect(all.body.find((b) => b.id === 'matilda').read).toBe(false);
    });

    it('rejects malformed JSON with 400', async () => {
      await request(app)
        .put('/api/books/matilda')
        .set('Content-Type', 'application/json')
        .send('{"read": tru')
        .expect(400);
    });
  });

  describe('video progress', () => {
    it('starts at 0 and saves a position', async () => {
      let res = await request(app).get('/api/video/progress').expect(200);
      expect(res.body.position).toBe(0);
      await request(app).put('/api/video/progress').send({ position: 4.25 }).expect(200);
      res = await request(app).get('/api/video/progress').expect(200);
      expect(res.body.position).toBe(4.25);
    });

    it.each([[{}], [{ position: -1 }], [{ position: '5' }], [{ position: null }]])(
      'rejects invalid body %j with 400',
      async (body) => {
        await request(app).put('/api/video/progress').send(body).expect(400);
      }
    );
  });

  describe('persistence', () => {
    it('keeps book statuses and video position after a server restart', async () => {
      await request(app).put('/api/books/a-brief-history-of-time').send({ read: true }).expect(200);
      await request(app).put('/api/video/progress').send({ position: 7.5 }).expect(200);

      // Simulate a restart: close the database and open a fresh app on the same data.
      await store.close();
      store = await backend.open(tmpDir);
      app = createApp({ store });

      const books = await request(app).get('/api/books').expect(200);
      expect(books.body.find((b) => b.id === 'a-brief-history-of-time').read).toBe(true);
      expect(books.body.filter((b) => b.read)).toHaveLength(1);
      const progress = await request(app).get('/api/video/progress').expect(200);
      expect(progress.body.position).toBe(7.5);
    });
  });
});

describe('database failures', () => {
  it('returns a JSON 500 (not a crash) when the database is unavailable', async () => {
    const fail = async () => {
      throw new Error('connection refused');
    };
    const brokenStore = { listBooks: fail, getBook: fail, setRead: fail, getProgress: fail, setProgress: fail };
    const app = createApp({ store: brokenStore });
    const original = console.error;
    console.error = () => {}; // keep test output clean
    try {
      const res = await request(app).put('/api/books/matilda').send({ read: true }).expect(500);
      expect(res.body.error).toMatch(/something went wrong/i);
      await request(app).get('/api/books').expect(500);
    } finally {
      console.error = original;
    }
  });
});
