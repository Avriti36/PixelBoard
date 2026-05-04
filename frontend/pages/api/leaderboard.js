import { connectDB } from '../../lib/mongodb';
import { computeLeaderboard } from '../../lib/models';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await connectDB();
  res.json(await computeLeaderboard());
}