require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// ─── Config ─────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pixelboard';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const GRID_COLS = 50;
const GRID_ROWS = 35;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS; // 1750
const COOLDOWN_MS = 1500; // 1.5 seconds between claims per user

// ─── Express + Socket.io setup ───────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: [FRONTEND_URL, 'http://localhost:3000'] }));
app.use(express.json());

// ─── MongoDB ─────────────────────────────────────────────────────────────────

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error(' MongoDB error:', err));

// Cell schema – one document per grid cell
const cellSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true }, // 0 … TOTAL_CELLS-1
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    owner: { type: String, default: null },       // userId
    ownerName: { type: String, default: null },
    color: { type: String, default: null },
    claimedAt: { type: Date, default: null },
    claimCount: { type: Number, default: 0 },     // times this cell has been reclaimed
  },
  { versionKey: false }
);

const Cell = mongoose.model('Cell', cellSchema);

// ─── Grid initialiser ────────────────────────────────────────────────────────

async function initGrid() {
  const count = await Cell.countDocuments();
  if (count === TOTAL_CELLS) {
    console.log(`Grid already initialised (${TOTAL_CELLS} cells)`);
    return;
  }

  console.log('Seeding grid…');
  await Cell.deleteMany({});

  const bulk = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      bulk.push({ id: y * GRID_COLS + x, x, y });
    }
  }
  await Cell.insertMany(bulk);
  console.log(`Grid ready: ${GRID_COLS}×${GRID_ROWS} = ${TOTAL_CELLS} cells`);
}

// ─── Leaderboard helper ───────────────────────────────────────────────────────

async function computeLeaderboard() {
  const results = await Cell.aggregate([
    { $match: { owner: { $ne: null } } },
    {
      $group: {
        _id: '$owner',
        ownerName: { $first: '$ownerName' },
        color: { $first: '$color' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  return results.map((r) => ({
    owner: r._id,
    ownerName: r.ownerName,
    color: r.color,
    count: r.count,
  }));
}

// ─── In-memory state ─────────────────────────────────────────────────────────

const onlineUsers = new Map();    // socketId → user object
const userCooldowns = new Map();  // userId   → last-claim timestamp (ms)

// ─── Socket.io events ────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Client announces who they are
  socket.on('join', async (user) => {
    onlineUsers.set(socket.id, { ...user, socketId: socket.id });

    // Acknowledge the join with current meta
    socket.emit('joined', {
      onlineCount: onlineUsers.size,
      cooldownMs: COOLDOWN_MS,
    });

    // Broadcast updated user list to everyone
    io.emit('online_count', onlineUsers.size);
    io.emit('online_users', Array.from(onlineUsers.values()));

    // Send leaderboard only to the new socket
    const leaderboard = await computeLeaderboard();
    socket.emit('leaderboard_update', leaderboard);
  });

  // Client tries to claim a block
  socket.on('claim_block', async ({ cellId, user }) => {
    if (cellId == null || !user?.id) return;

    const now = Date.now();
    const lastClaim = userCooldowns.get(user.id) ?? 0;
    const remaining = COOLDOWN_MS - (now - lastClaim);

    if (remaining > 0) {
      // Tell only this socket about the cooldown
      socket.emit('claim_rejected', { cellId, remaining });
      return;
    }

    try {
      const updated = await Cell.findOneAndUpdate(
        { id: cellId },
        {
          owner: user.id,
          ownerName: user.name,
          color: user.color,
          claimedAt: new Date(),
          $inc: { claimCount: 1 },
        },
        { new: true }
      );

      if (!updated) return; 

      // Record cooldown
      userCooldowns.set(user.id, now);

      // Broadcast the claim to ALL connected sockets (including sender)
      io.emit('block_claimed', {
        cellId,
        owner: user.id,
        ownerName: user.name,
        color: user.color,
        claimedAt: updated.claimedAt.toISOString(),
        claimCount: updated.claimCount,
      });

      // Async leaderboard refresh for everyone
      const leaderboard = await computeLeaderboard();
      io.emit('leaderboard_update', leaderboard);
    } catch (err) {
      console.error('claim_block error:', err);
      socket.emit('claim_rejected', { cellId, error: 'Server error' });
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    io.emit('online_count', onlineUsers.size);
    io.emit('online_users', Array.from(onlineUsers.values()));
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// ─── REST API ────────────────────────────────────────────────────────────────

// Full grid snapshot (used on page load)
app.get('/api/grid', async (_req, res) => {
  try {
    const cells = await Cell.find({}, '-_id id x y owner ownerName color claimedAt claimCount').lean();
    res.json({ cells, cols: GRID_COLS, rows: GRID_ROWS, cooldownMs: COOLDOWN_MS });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load grid' });
  }
});

// Leaderboard
app.get('/api/leaderboard', async (_req, res) => {
  try {
    res.json(await computeLeaderboard());
  } catch {
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// Stats
app.get('/api/stats', async (_req, res) => {
  try {
    const total = TOTAL_CELLS;
    const claimed = await Cell.countDocuments({ owner: { $ne: null } });
    res.json({ total, claimed, unclaimed: total - claimed, percent: ((claimed / total) * 100).toFixed(1) });
  } catch {
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// ─── Boot ────────────────────────────────────────────────────────────────────

initGrid().then(() => {
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
});
