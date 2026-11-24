import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

let tmpDir;
let dbFile;
let db;
let app;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rct-'));
  dbFile = path.join(tmpDir, 'test.db');
  db = openDb(dbFile);
  app = createApp({ db });
});

afterEach(() => {
  if (db.open) db.close();
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

    // Simulate a restart: close the DB and open a fresh app on the same file.
    db.close();
    db = openDb(dbFile);
    app = createApp({ db });

    const books = await request(app).get('/api/books').expect(200);
    expect(books.body.find((b) => b.id === 'a-brief-history-of-time').read).toBe(true);
    expect(books.body.filter((b) => b.read)).toHaveLength(1);
    const progress = await request(app).get('/api/video/progress').expect(200);
    expect(progress.body.position).toBe(7.5);
  });
});
