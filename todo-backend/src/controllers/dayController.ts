import type { Request, Response } from "express";
import { DayTodo } from "../models/index.js";
import { catchAsync, sendSuccess, notFound } from "../utils/index.js";
import { MESSAGES } from "../constants/index.js";
import type { IDayTodoItem } from "../types/index.js";
import { isFirstDayOfWeek, isFirstDayOfMonth } from "../utils/datePeriod.js";
import { normalizeItems } from "../utils/normalizeItem.js";
import {
  parseDateString,
  toWeekdayIndexMondayFirst,
  initializeDayItems,
  mergeNewItemsIntoExistingDay,
} from "../services/dayService.js";

/**
 * GET /api/days/:date
 * Returns day todo list. Creates from List 1 (daily default) if not exists.
 * Option B: when day exists, merges missing List 1 items every GET.
 * List 2: on Monday merges week template, on 1st of month merges month template.
 */
export const getDay = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const date = req.params.date;
  const dateObj = parseDateString(date);
  const isMonday = isFirstDayOfWeek(dateObj);
  const isFirstOfMonth = isFirstDayOfMonth(dateObj);
  const weekdayIndex = toWeekdayIndexMondayFirst(dateObj);
  const dayOfMonth = dateObj.getUTCDate();
  const month = dateObj.getUTCMonth() + 1;

  let dayTodo = await DayTodo.findOne({ userId, date });

  if (!dayTodo) {
    const items = await initializeDayItems(
      userId, date, weekdayIndex, isMonday, dayOfMonth, isFirstOfMonth, month
    );
    dayTodo = await DayTodo.create({ userId, date, items });
  } else {
    const result = await mergeNewItemsIntoExistingDay(
      dayTodo.items, userId, date,
      weekdayIndex, isMonday, dayOfMonth, isFirstOfMonth, month
    );
    if (result.modified) {
      dayTodo.items = result.items;
      await dayTodo.save();
    }
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
    dayTodo.items = normalizeItems(items);
    await dayTodo.save();
  }

  sendSuccess(res, 200, { dayTodo });
});
