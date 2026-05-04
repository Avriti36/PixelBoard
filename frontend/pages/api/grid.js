import { connectDB } from '../../lib/mongodb';
import { Cell, initGrid, GRID_COLS_EXPORT, GRID_ROWS_EXPORT, COOLDOWN_MS } from '../../lib/models';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await connectDB();
  await initGrid();
  const cells = await Cell.find({}, '-_id id x y owner ownerName color claimedAt claimCount').lean();
  res.json({ cells, cols: GRID_COLS_EXPORT, rows: GRID_ROWS_EXPORT, cooldownMs: COOLDOWN_MS });
}