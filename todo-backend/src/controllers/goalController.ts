import type { Request, Response } from "express";
import { Goal } from "../models/index.js";
import { catchAsync, sendSuccess, notFound } from "../utils/index.js";
import { MESSAGES } from "../constants/index.js";
import type { IGoalItem } from "../types/index.js";

/**
 * GET /api/goals?type=week|month|year&period=...
 * Returns one goal doc. Creates with empty items if not found (user adds items manually).
 */
export const getGoal = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const type = req.query.type as "week" | "month" | "year";
  const period = req.query.period as string;

  let goal = await Goal.findOne({ userId, type, period });

  if (!goal) {
    goal = await Goal.create({
      userId,
      type,
      period,
      items: [],
    });
  }

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
      existing.items = items.map((item, i) => ({
        title: item.title ?? "",
        completed: Boolean(item.completed),
        order: typeof item.order === "number" ? item.order : i,
      }));
      await existing.save();
      return sendSuccess(res, 200, { goal: existing });
    }
    return sendSuccess(res, 200, { goal: existing });
  }

  const goalItems: IGoalItem[] = Array.isArray(items)
    ? items.map((item, i) => ({
        title: item.title ?? "",
        completed: Boolean(item.completed),
        order: typeof item.order === "number" ? item.order : i,
      }))
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
    goal.items = items.map((item, i) => ({
      title: item.title ?? "",
      completed: Boolean(item.completed),
      order: typeof item.order === "number" ? item.order : i,
    }));
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

  goal.items.splice(index, 1);
  goal.items.forEach((item, i) => {
    item.order = i;
  });
  await goal.save();

  sendSuccess(res, 200, { goal });
});
