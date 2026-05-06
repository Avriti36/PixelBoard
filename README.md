# PixelBoard — Real-Time Shared Grid

A multiplayer real-time grid where anyone can claim tiles. Built with **Next.js**, **Express**, **Socket.io**, and **MongoDB**.

```
50 × 35 = 1,750 tiles · Real-time WebSockets · Live leaderboard · 1.5s cooldown
```

---

## Stack

| Layer     | Tech                  |
| --------- | --------------------- |
| Frontend  | Next.js 14, React 18  |
| Backend   | NExt.js route, Pusher |
| Database  | MongoDB + Mongoose    |
| Real-time | WebSocket (Pusher)    |

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://localhost:27017`)

### 1. Backend

```bash
cd backend
cp .env.example .env    # edit if needed
npm install
npm run dev             # starts on :4000
```

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # edit if needed
npm install
npm run dev             # starts on :3000
```

Open **http://localhost:3000** in multiple browser tabs to test real-time sync.

---

## Architecture

```
Browser A ──┐
Browser B ──┤─── Socket.io ───► Express Server ──► MongoDB
Browser C ──┘                        │
                                     └──► Broadcasts to all browsers
```

### Real-time Flow

1. Client opens page → fetches full grid via REST (`GET /api/grid`)
2. Client connects to Socket.io and emits `join` with their identity
3. When a tile is clicked → client emits `claim_block`
4. Server validates cooldown → updates MongoDB → broadcasts `block_claimed` to **all** sockets
5. Every client patches their local grid state instantly

### Conflict Resolution

- Last write wins (MongoDB `findOneAndUpdate`)
- Server-side cooldown enforcement (1.5s per user ID)
- No optimistic updates — server is source of truth

---

## API Reference

| Method | Path               | Description        |
| ------ | ------------------ | ------------------ |
| GET    | `/api/grid`        | Full grid snapshot |
| GET    | `/api/leaderboard` | Top 10 players     |
| GET    | `/api/stats`       | Claim stats        |
| GET    | `/health`          | Health check       |

### Socket Events

**Client → Server**
| Event | Payload |
|-------|---------|
| `join` | `{ id, name, color }` |
| `claim_block` | `{ cellId, user }` |

**Server → Client**
| Event | Payload |
|-------|---------|
| `joined` | `{ onlineCount, cooldownMs }` |
| `block_claimed` | `{ cellId, owner, ownerName, color, claimedAt }` |
| `leaderboard_update` | `Array<{ owner, ownerName, color, count }>` |
| `online_count` | `number` |
| `claim_rejected` | `{ cellId, remaining? }` |

---

## Features

- **1,750 tiles** in a 50×35 grid
- **Random identity** on first visit (name + color, persisted in localStorage)
- **Click to rename** your display name
- **Color picker** to change your tile color
- **1.5s cooldown** enforced server-side per user
- **Live leaderboard** — top 10 by tile count
- **Activity feed** — last 8 claim events
- **Board fill bar** — see % of board claimed
- **Zoom** (Ctrl+scroll or ± buttons, 6–32px per cell)
- **Pan** (Alt+drag or scroll)
- **Claim animation** — tiles flash + glow when captured
- **Tooltip** — hover to see who owns a tile
- **Online counter** — live WebSocket user count

---

## Env Variables

**backend/.env**

```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/pixelboard
FRONTEND_URL=http://localhost:3000
```

**frontend/.env.local**

```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
```
