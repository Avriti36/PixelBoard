import Pusher from 'pusher';
Pusher.logToConsole = true;
import { connectDB } from '../../lib/mongodb';
import { Cell, computeLeaderboard, COOLDOWN_MS } from '../../lib/models';

const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY?.trim();
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim();

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID,
  key:     pusherKey,
  secret:  process.env.PUSHER_SECRET,
  cluster: pusherCluster,
  useTLS:  true,
});

const userCooldowns = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { cellId, user } = req.body;
  if (cellId == null || !user?.id) return res.status(400).json({ error: 'Missing cellId or user' });

  const now = Date.now();
  const last = userCooldowns.get(user.id) ?? 0;
  const remaining = COOLDOWN_MS - (now - last);
  if (remaining > 0) return res.status(429).json({ error: 'Cooldown', remaining });

  try {
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
      owner:      user.id,
      ownerName:  user.name,
      color:      user.color,
      claimedAt:  updated.claimedAt.toISOString(),
      claimCount: updated.claimCount,
    };

    try {
      await pusher.trigger('pixelboard', 'block_claimed', payload);
      const leaderboard = await computeLeaderboard();
      await pusher.trigger('pixelboard', 'leaderboard_update', leaderboard);
    } catch (pusherErr) {
      // Log Pusher error but don't fail the request — DB already updated
      console.error('Pusher error:', pusherErr.message);
    }

    res.json({ ok: true, cell: payload });

  } catch (err) {
    console.error('claim error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
