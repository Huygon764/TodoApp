import { Expense } from "../models/index.js";

export async function listExpenses(
  userId: string,
  from: string,
  to: string,
) {
  return Expense.find({ userId, date: { $gte: from, $lte: to } })
    .sort({ date: -1, createdAt: -1 })
    .lean();
}

export interface DaySummary {
  date: string;
  total: number;
  count: number;
}

export async function summarizeExpenses(
  userId: string,
  from: string,
  to: string,
): Promise<{ days: DaySummary[]; total: number }> {
  const days: DaySummary[] = await Expense.aggregate([
    { $match: { userId: Expense.base.Types.ObjectId.createFromHexString(userId), date: { $gte: from, $lte: to } } },
    { $group: { _id: "$date", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
    { $project: { _id: 0, date: "$_id", total: 1, count: 1 } },
  ]);
  const total = days.reduce((s, d) => s + d.total, 0);
  return { days, total };
}

export async function createExpense(
  userId: string,
  data: { date: string; amount: number; description: string },
) {
  return Expense.create({ userId, ...data });
}

export async function updateExpense(
  userId: string,
  id: string,
  data: Partial<{ date: string; amount: number; description: string }>,
) {
  return Expense.findOneAndUpdate({ _id: id, userId }, data, { new: true }).lean();
}

export async function deleteExpense(
  userId: string,
  id: string,
): Promise<boolean> {
  const res = await Expense.deleteOne({ _id: id, userId });
  return res.deletedCount > 0;
}
