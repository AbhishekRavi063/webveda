# Reading Challenge Tracker

A small web app where a reader marks books as read or unread across two lists, and a welcome video resumes from where it was paused.

Stack: React, Vite, Tailwind CSS, Node.js, Express. Data is stored in SQLite locally and in Postgres (Neon) on Vercel.

## Project structure

```
server/           Backend
  src/index.js    Starts the server
  src/app.js      API routes and validation
  src/store/      Database: SQLite (local, Docker) or Postgres (Vercel)
  test/           API tests, run against both databases

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

## Deploy on Vercel

1. Import the GitHub repo in Vercel.
2. In the project, open Storage, create a Neon Postgres database and connect it. This sets DATABASE_URL.
3. Redeploy.

When DATABASE_URL is set the app uses Postgres, so data survives refreshes, redeploys and restarts. Tables and the six books are created on first request.

## API

| Method | Path | Body |
|---|---|---|
| GET | /api/books | |
| PUT | /api/books/:id | { "read": true } |
| GET | /api/video/progress | |
| PUT | /api/video/progress | { "position": 12.5 } |

Unknown book IDs return 404. A missing or non-boolean status returns 400.

## Verify

Run the tests (SQLite and Postgres):

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
