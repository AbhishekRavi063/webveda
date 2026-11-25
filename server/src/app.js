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

// Express 4 does not catch errors from async handlers; pass them to next().
const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function validationError(res, result) {
  return res.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid request body.' });
}

/**
 * Builds the Express app. `store` is the database (SQLite or Postgres, see
 * store/index.js); every route goes through it, so the routes don't care which.
 */
export function createApp({ store, staticDir } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.get(
    '/api/books',
    handle(async (_req, res) => {
      res.json(await store.listBooks());
    })
  );

  // PUT sets an absolute value (not a toggle), so sending the same request
  // twice leaves the same status: the endpoint is idempotent.
  app.put(
    '/api/books/:id',
    handle(async (req, res) => {
      const existing = await store.getBook(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: `Unknown book id "${req.params.id}".` });
      }
      const parsed = bookUpdateSchema.safeParse(req.body ?? {});
      if (!parsed.success) return validationError(res, parsed);

      res.json(await store.setRead(existing.id, parsed.data.read));
    })
  );

  app.get(
    '/api/video/progress',
    handle(async (_req, res) => {
      res.json(await store.getProgress());
    })
  );

  app.put(
    '/api/video/progress',
    handle(async (req, res) => {
      const parsed = progressSchema.safeParse(req.body ?? {});
      if (!parsed.success) return validationError(res, parsed);

      res.json(await store.setProgress(parsed.data.position));
    })
  );

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
