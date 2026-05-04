import Pusher from 'pusher';
import { connectDB } from '../../lib/mongodb';
import { Cell, computeLeaderboard, COOLDOWN_MS } from '../../lib/models';

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID,
  key:     process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret:  process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS:  true,
});

// In-memory cooldown (resets on cold start, good enough for free tier)
const userCooldowns = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { cellId, user } = req.body;
  if (cellId == null || !user?.id) return res.status(400).json({ error: 'Missing cellId or user' });

  // Cooldown check
  const now = Date.now();
  const last = userCooldowns.get(user.id) ?? 0;
  const remaining = COOLDOWN_MS - (now - last);
  if (remaining > 0) return res.status(429).json({ error: 'Cooldown', remaining });

  await connectDB();

  const updated = await Cell.findOneAndUpdate(
    { id: cellId },
    { owner: user.id, ownerName: user.name, color: user.color, claimedAt: new Date(), $inc: { claimCount: 1 } },
    { new: true }
  );

  if (!updated) return res.status(404).json({ error: 'Cell not found' });

  userCooldowns.set(user.id, now);

  const payload = {
    cellId,
    owner:     user.id,
    ownerName: user.name,
    color:     user.color,
    claimedAt: updated.claimedAt.toISOString(),
    claimCount: updated.claimCount,
  };

  // Trigger Pusher event to all clients
  await pusher.trigger('pixelboard', 'block_claimed', payload);

  // Also push updated leaderboard
  const leaderboard = await computeLeaderboard();
  await pusher.trigger('pixelboard', 'leaderboard_update', leaderboard);

  res.json({ ok: true, cell: payload });
}