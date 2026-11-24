import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { z } from 'zod';

// `read` must be present and a real boolean. "true", 1, null are all rejected.
const bookUpdateSchema = z.object({
  read: z.boolean({
    required_error: 'Field "read" is required.',
    invalid_type_error: 'Field "read" must be a boolean (true or false).',
  }),
});

const MAX_VIDEO_SECONDS = 24 * 60 * 60;
const progressSchema = z.object({
  position: z
    .number({
      required_error: 'Field "position" is required.',
      invalid_type_error: 'Field "position" must be a number of seconds.',
    })
    .finite()
    .min(0, 'Field "position" cannot be negative.')
    .max(MAX_VIDEO_SECONDS, 'Field "position" is too large.'),
});

function toBook(row) {
  return { id: row.id, title: row.title, list: row.list, read: row.read === 1 };
}

function validationError(res, result) {
  return res.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid request body.' });
}

export function createApp({ db, staticDir } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  const stmts = {
    allBooks: db.prepare("SELECT * FROM books ORDER BY CASE list WHEN 'fiction' THEN 0 ELSE 1 END, position"),
    getBook: db.prepare('SELECT * FROM books WHERE id = ?'),
    setRead: db.prepare('UPDATE books SET read = ? WHERE id = ?'),
    getProgress: db.prepare('SELECT position, updated_at FROM video_progress WHERE id = 1'),
    setProgress: db.prepare("UPDATE video_progress SET position = ?, updated_at = datetime('now') WHERE id = 1"),
  };

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.get('/api/books', (_req, res) => {
    res.json(stmts.allBooks.all().map(toBook));
  });

  // PUT sets an absolute value (not a toggle), so sending the same request
  // twice leaves the same status: the endpoint is idempotent.
  app.put('/api/books/:id', (req, res) => {
    const existing = stmts.getBook.get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: `Unknown book id "${req.params.id}".` });
    }
    const parsed = bookUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) return validationError(res, parsed);

    stmts.setRead.run(parsed.data.read ? 1 : 0, existing.id);
    res.json(toBook(stmts.getBook.get(existing.id)));
  });

  app.get('/api/video/progress', (_req, res) => {
    const row = stmts.getProgress.get();
    res.json({ position: row.position, updatedAt: row.updated_at });
  });

  app.put('/api/video/progress', (req, res) => {
    const parsed = progressSchema.safeParse(req.body ?? {});
    if (!parsed.success) return validationError(res, parsed);

    stmts.setProgress.run(parsed.data.position);
    const row = stmts.getProgress.get();
    res.json({ position: row.position, updatedAt: row.updated_at });
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

  // In production the same server hosts the built React app.
  if (staticDir && fs.existsSync(path.join(staticDir, 'index.html'))) {
    app.use(express.static(staticDir));
    app.get('*', (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  // Malformed JSON bodies and any unexpected errors return JSON, not HTML.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body must be valid JSON.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  });

  return app;
}
