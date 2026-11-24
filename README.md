# Reading Challenge Tracker

A small web app where a reader marks books as read or unread across two lists, and a welcome video resumes from where it was paused.

Stack: React, Vite, Tailwind CSS, Node.js, Express, SQLite.

## Project structure

```
server/           Backend
  src/index.js    Starts the server
  src/app.js      API routes and validation
  src/db.js       SQLite tables and seed data
  test/           API tests

client/           Frontend
  src/App.jsx     Main page
  src/api.js      Calls to the backend
  src/hooks/      Book and toast state
  src/components/ UI components
```

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173

Production mode:

```bash
npm run build
npm start
```

Open http://localhost:3001

## Run with Docker

```bash
docker build -t reading-challenge .
docker run -p 3000:3000 -v reading-data:/data reading-challenge
```

Open http://localhost:3000

## API

| Method | Path | Body |
|---|---|---|
| GET | /api/books | |
| PUT | /api/books/:id | { "read": true } |
| GET | /api/video/progress | |
| PUT | /api/video/progress | { "position": 12.5 } |

Unknown book IDs return 404. A missing or non-boolean status returns 400.

## Verify

Run the tests:

```bash
npm test
```

Check by hand:

1. Mark a book as read, refresh the page. It stays marked.
2. Restart the server, refresh. It still stays marked.
3. Play the video, pause, refresh, press play. It continues from where you paused.
4. Stop the server and mark a book. It goes back to its previous value and shows an error.

## Known limitations

- One demo reader, no sign-in.
- Video position is saved on pause, not when the tab is closed during playback.
- The video loads from an external sample URL.
- Only the backend has automated tests.

## AI usage

Claude was used to build the code.

One thing I verified: book statuses and the video position are still saved after a full server restart.
