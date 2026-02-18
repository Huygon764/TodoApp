import type { Request, Response } from "express";
import { DayTodo, DefaultItem, RecurringTemplate } from "../models/index.js";
import { catchAsync, sendSuccess, notFound } from "../utils/index.js";
import { MESSAGES } from "../constants/index.js";
import type { IDayTodoItem } from "../types/index.js";
import { isFirstDayOfWeek, isFirstDayOfMonth } from "../utils/datePeriod.js";

/** Parse YYYY-MM-DD to Date at noon UTC for weekday/monthday checks */
function parseDateString(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00Z");
}

/** Append items from source to dayTodo.items if title not already present (by trimmed title, case-sensitive) */
function mergeItemsByTitle(
  existing: IDayTodoItem[],
  source: { title: string }[],
  startOrder: number
): IDayTodoItem[] {
  const existingTitles = new Set(
    existing.map((it) => (it.title ?? "").trim())
  );
  const toAppend: IDayTodoItem[] = [];
  for (const s of source) {
    const t = (s.title ?? "").trim();
    if (t && !existingTitles.has(t)) {
      existingTitles.add(t);
      toAppend.push({
        title: s.title,
        completed: false,
        order: startOrder + toAppend.length,
      });
    }
  }
  return existing.length === 0 && toAppend.length === 0
    ? existing
    : [...existing, ...toAppend];
}

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

  let dayTodo = await DayTodo.findOne({ userId, date });

  if (!dayTodo) {
    const defaultItems = await DefaultItem.find({ userId }).sort({ order: 1 });
    let items: IDayTodoItem[] = defaultItems.map((d, i) => ({
      title: d.title,
      completed: false,
      order: i,
    }));
    if (isMonday) {
      const weekTemplate = await RecurringTemplate.findOne({
        userId,
        type: "week",
      });
      if (weekTemplate?.items?.length) {
        items = mergeItemsByTitle(items, weekTemplate.items, items.length);
      }
    }
    if (isFirstOfMonth) {
      const monthTemplate = await RecurringTemplate.findOne({
        userId,
        type: "month",
      });
      if (monthTemplate?.items?.length) {
        items = mergeItemsByTitle(items, monthTemplate.items, items.length);
      }
    }
    dayTodo = await DayTodo.create({
      userId,
      date,
      items,
    });
  } else {
    let modified = false;

    // List 1 (Option B): merge missing default items on every GET
    const defaultItems = await DefaultItem.find({ userId }).sort({ order: 1 });
    const afterDefault = mergeItemsByTitle(
      dayTodo.items,
      defaultItems,
      dayTodo.items.length
    );
    if (afterDefault.length !== dayTodo.items.length) {
      dayTodo.items = afterDefault;
      modified = true;
    }

    // List 2: merge recurring template on Monday (week) or 1st of month (month)
    if (isMonday) {
      const weekTemplate = await RecurringTemplate.findOne({
        userId,
        type: "week",
      });
      if (weekTemplate?.items?.length) {
        const before = dayTodo.items.length;
        dayTodo.items = mergeItemsByTitle(
          dayTodo.items,
          weekTemplate.items,
          dayTodo.items.length
        );
        if (dayTodo.items.length !== before) modified = true;
      }
    }
    if (isFirstOfMonth) {
      const monthTemplate = await RecurringTemplate.findOne({
        userId,
        type: "month",
      });
      if (monthTemplate?.items?.length) {
        const before = dayTodo.items.length;
        dayTodo.items = mergeItemsByTitle(
          dayTodo.items,
          monthTemplate.items,
          dayTodo.items.length
        );
        if (dayTodo.items.length !== before) modified = true;
      }
    }

    if (modified) await dayTodo.save();
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
