import { connectDB } from '../../lib/mongodb';
import { Cell, TOTAL_CELLS_EXPORT } from '../../lib/models';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await connectDB();
  const claimed = await Cell.countDocuments({ owner: { $ne: null } });
  const total = TOTAL_CELLS_EXPORT;
  res.json({ total, claimed, unclaimed: total - claimed, percent: ((claimed / total) * 100).toFixed(1) });
}