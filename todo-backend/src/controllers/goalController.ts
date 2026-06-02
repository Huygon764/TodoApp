import type { Request, Response } from "express";
import { Goal } from "../models/index.js";
import { catchAsync, sendSuccess, notFound, removeAndReorder } from "../utils/index.js";
import { MESSAGES } from "../constants/index.js";
import type { IGoalItem } from "../types/index.js";
import { normalizeItems } from "../utils/normalizeItem.js";

/**
 * GET /api/goals?type=week|month|year&period=...
 * Returns the goal doc for the period, or null if none exists yet. Read-only:
 * the doc is created lazily on first POST/PATCH, so merely viewing a day does
 * not litter the DB with empty goals.
 */
export const getGoal = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const type = req.query.type as "week" | "month" | "year";
  const period = req.query.period as string;

  const goal = await Goal.findOne({ userId, type, period });

  sendSuccess(res, 200, { goal });
});

/**
 * POST /api/goals
 * Body: { type, period, items? }
 */
export const createGoal = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { type, period, items } = req.body as {
    type: "week" | "month" | "year";
    period: string;
    items?: IGoalItem[];
  };

  const existing = await Goal.findOne({ userId, type, period });

  if (existing) {
    if (Array.isArray(items) && items.length > 0) {
      existing.items = normalizeItems(items);
      await existing.save();
      return sendSuccess(res, 200, { goal: existing });
    }
    return sendSuccess(res, 200, { goal: existing });
  }

  const goalItems: IGoalItem[] = Array.isArray(items)
    ? normalizeItems(items)
    : [];

  const goal = await Goal.create({
    userId,
    type,
    period,
    items: goalItems,
  });

  sendSuccess(res, 201, { goal });
});

/**
 * PATCH /api/goals/:id
 * Body: { items? }
 */
export const patchGoal = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { items } = req.body as { items?: IGoalItem[] };

  const goal = await Goal.findOne({ _id: id, userId });
  if (!goal) {
    throw notFound(MESSAGES.GOAL.NOT_FOUND);
  }

  if (Array.isArray(items)) {
    goal.items = normalizeItems(items);
    await goal.save();
  }

  sendSuccess(res, 200, { goal });
});

/**
 * DELETE /api/goals/:id/items/:idx
 * Removes item at index.
 */
export const deleteGoalItem = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id, idx } = req.params;
  const index = parseInt(idx!, 10);

  const goal = await Goal.findOne({ _id: id, userId });
  if (!goal) {
    throw notFound(MESSAGES.GOAL.NOT_FOUND);
  }

  if (index < 0 || index >= goal.items.length) {
    throw notFound(MESSAGES.GOAL.NOT_FOUND);
  }

  removeAndReorder(goal.items, index);
  await goal.save();

  sendSuccess(res, 200, { goal });
});
