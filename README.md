# PixelBoard - Real-Time Shared Grid

A multiplayer pixel grid where users can claim tiles, change their color, and watch the board update live across browser tabs.

```txt
50 x 35 = 1,750 tiles | Pusher realtime sync | MongoDB persistence | Live leaderboard
```

## Stack

| Layer | Tech |
| --- | --- |
| App | Next.js 14, React 18 |
| API | Next.js API routes |
| Database | MongoDB + Mongoose |
| Realtime | Pusher Channels |

## Quick Start

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000` in two browser tabs to test realtime sync.

## Environment Variables

Create `frontend/.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/pixelboard

PUSHER_APP_ID=2150220
PUSHER_SECRET=your_pusher_secret
NEXT_PUBLIC_PUSHER_KEY=your_pusher_public_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap2
```

Important Pusher split:

- `NEXT_PUBLIC_PUSHER_KEY` is the public app key. It is safe for the browser.
- `PUSHER_SECRET` is server-only. Do not prefix it with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_PUSHER_CLUSTER` must match the cluster shown in the Pusher dashboard.

Example shape:

```env
PUSHER_APP_ID=2150220
NEXT_PUBLIC_PUSHER_KEY=8d84c64529223777ef7d
PUSHER_SECRET=your_secret_here
NEXT_PUBLIC_PUSHER_CLUSTER=ap2
```

After changing `.env.local`, restart the Next dev server. Next.js reads env values at startup.

## Architecture

```txt
Browser A
Browser B  --->  Next.js page/API  --->  MongoDB
Browser C              |
                       +----------->  Pusher Channels
                                      |
                                      +-- realtime events to all tabs
```

## Realtime Flow

1. The page loads the current grid from `GET /api/grid`.
2. The browser subscribes to the Pusher `pixelboard` channel.
3. A user clicks a cell.
4. `POST /api/claim` validates the claim and saves it to MongoDB.
5. The clicked tab updates immediately from the API response.
6. The API route broadcasts `block_claimed` and `leaderboard_update` through Pusher.
7. Other tabs receive the Pusher events and update without refresh.

## API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/grid` | Load the full grid |
| `POST` | `/api/claim` | Claim a cell |
| `GET` | `/api/leaderboard` | Load top players |
| `GET` | `/api/stats` | Load board stats |

## Pusher Events

| Event | Direction | Payload |
| --- | --- | --- |
| `block_claimed` | Server to clients | `{ cellId, owner, ownerName, color, claimedAt, claimCount }` |
| `leaderboard_update` | Server to clients | `Array<{ owner, ownerName, color, count }>` |

## Reset The Board

The grid data lives in the MongoDB `cells` collection. To start clean, drop that collection. The app recreates a blank 50 x 35 grid the next time `/api/grid` runs.

Using Atlas UI:

1. Open MongoDB Atlas.
2. Go to your cluster.
3. Open Browse Collections.
4. Select the PixelBoard database.
5. Drop the `cells` collection.

Using `mongosh`:

```bash
mongosh "YOUR_MONGODB_URI" --eval "db.cells.drop()"
```

## Deployment On Vercel

Add the same env variables in Vercel Project Settings:

```env
MONGODB_URI=your_atlas_connection_string
PUSHER_APP_ID=your_app_id
PUSHER_SECRET=your_secret
NEXT_PUBLIC_PUSHER_KEY=your_public_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap2
```

Development-only browser logs such as React DevTools and HMR do not appear in Vercel production builds. App logs still appear if `console.log`, `console.warn`, `console.error`, or `Pusher.logToConsole = true` are left in client code.

## Features

- 1,750 claimable cells
- Random local user identity stored in `localStorage`
- Color picker and rename controls
- 1.5 second claim cooldown
- Realtime grid updates across tabs
- Live leaderboard
- Board stats
- Zoom and pan controls
- Claim animation and owner tooltip
