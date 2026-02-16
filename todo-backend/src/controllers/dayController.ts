import type { Request, Response } from "express";
import { DayTodo, DefaultItem } from "../models/index.js";
import { catchAsync, sendSuccess, notFound } from "../utils/index.js";
import { MESSAGES } from "../constants/index.js";
import type { IDayTodoItem } from "../types/index.js";

/**
 * GET /api/days/:date
 * Returns day todo list. If not exists, creates from default template then returns.
 */
export const getDay = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const date = req.params.date;

  let dayTodo = await DayTodo.findOne({ userId, date });

  if (!dayTodo) {
    const defaultItems = await DefaultItem.find({ userId }).sort({ order: 1 });
    const items: IDayTodoItem[] = defaultItems.map((d, i) => ({
      title: d.title,
      completed: false,
      order: i,
    }));
    dayTodo = await DayTodo.create({
      userId,
      date,
      items,
    });
  }

  sendSuccess(res, 200, { dayTodo });
});

/**
 * PATCH /api/days/:date
 * Update day items (replace full array or partial updates).
 */
export const patchDay = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const date = req.params.date;
  const { items } = req.body as { items?: IDayTodoItem[] };

  const dayTodo = await DayTodo.findOne({ userId, date });
  if (!dayTodo) {
    throw notFound(MESSAGES.DAY.NOT_FOUND);
  }

  if (Array.isArray(items)) {
    dayTodo.items = items.map((item, i) => ({
      title: item.title ?? "",
      completed: Boolean(item.completed),
      order: typeof item.order === "number" ? item.order : i,
    }));
    await dayTodo.save();
  }

  sendSuccess(res, 200, { dayTodo });
});
