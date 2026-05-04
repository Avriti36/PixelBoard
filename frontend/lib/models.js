import mongoose from 'mongoose';

const GRID_COLS = 50;
const GRID_ROWS = 35;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

const cellSchema = new mongoose.Schema({
  id:        { type: Number, unique: true, index: true },
  x:         { type: Number, required: true },
  y:         { type: Number, required: true },
  owner:     { type: String, default: null },
  ownerName: { type: String, default: null },
  color:     { type: String, default: null },
  claimedAt: { type: Date,   default: null },
  claimCount:{ type: Number, default: 0 },
}, { versionKey: false });

export const Cell = mongoose.models.Cell || mongoose.model('Cell', cellSchema);

export async function initGrid() {
  const count = await Cell.countDocuments();
  if (count === TOTAL_CELLS) return;
  await Cell.deleteMany({});
  const bulk = [];
  for (let y = 0; y < GRID_ROWS; y++)
    for (let x = 0; x < GRID_COLS; x++)
      bulk.push({ id: y * GRID_COLS + x, x, y });
  await Cell.insertMany(bulk);
}

export async function computeLeaderboard() {
  const results = await Cell.aggregate([
    { $match: { owner: { $ne: null } } },
    { $group: { _id: '$owner', ownerName: { $first: '$ownerName' }, color: { $first: '$color' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  return results.map((r) => ({ owner: r._id, ownerName: r.ownerName, color: r.color, count: r.count }));
}

export const GRID_COLS_EXPORT = GRID_COLS;
export const GRID_ROWS_EXPORT = GRID_ROWS;
export const TOTAL_CELLS_EXPORT = TOTAL_CELLS;
export const COOLDOWN_MS = 1500;