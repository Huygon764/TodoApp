import type { Request, Response } from "express";
import { DayTodo } from "../models/index.js";
import { catchAsync, sendSuccess, notFound } from "../utils/index.js";
import { MESSAGES } from "../constants/index.js";
import type { IDayTodoItem } from "../types/index.js";
import {
  isFirstDayOfWeek,
  isFirstDayOfMonth,
  getTodayInTimeZone,
} from "../utils/datePeriod.js";
import { normalizeItems } from "../utils/normalizeItem.js";
import {
  parseDateString,
  toWeekdayIndexMondayFirst,
  initializeDayItems,
  mergeNewItemsIntoExistingDay,
  mergeCarryOverItems,
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
  const today = getTodayInTimeZone(req.userDoc?.timezone);
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
    const carry = await mergeCarryOverItems(items, userId, date, today);
    dayTodo = await DayTodo.create({ userId, date, items: carry.items });
  } else {
    const result = await mergeNewItemsIntoExistingDay(
      dayTodo.items, userId, date,
      weekdayIndex, isMonday, dayOfMonth, isFirstOfMonth, month
    );
    const carry = await mergeCarryOverItems(result.items, userId, date, today);
    if (result.modified || carry.modified) {
      dayTodo.items = carry.items;
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
  const { items, reflection, mood, energy, gratitude } = req.body as {
    items?: IDayTodoItem[];
    reflection?: string;
    mood?: number | null;
    energy?: number | null;
    gratitude?: string;
  };

  const dayTodo = await DayTodo.findOne({ userId, date });
  if (!dayTodo) {
    throw notFound(MESSAGES.DAY.NOT_FOUND);
  }

  let modified = false;
  if (Array.isArray(items)) {
    dayTodo.items = normalizeItems(items);
    modified = true;
  }
  if (typeof reflection === "string") {
    dayTodo.reflection = reflection.trim();
    modified = true;
  }
  // null clears the value; undefined leaves it untouched.
  if (mood !== undefined) {
    dayTodo.set("mood", mood === null ? undefined : mood);
    modified = true;
  }
  if (energy !== undefined) {
    dayTodo.set("energy", energy === null ? undefined : energy);
    modified = true;
  }
  if (typeof gratitude === "string") {
    dayTodo.gratitude = gratitude.trim();
    modified = true;
  }
  if (modified) {
    await dayTodo.save();
  }

  sendSuccess(res, 200, { dayTodo });
});

/** Shift a YYYY-MM-DD date back by whole years/months, keeping the day number. */
function shiftDateBack(
  date: string,
  { years = 0, months = 0 }: { years?: number; months?: number }
): string {
  const [y, m, d] = date.split("-").map(Number);
  let year = y - years;
  let month = m - months;
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(d)}`;
}

/**
 * GET /api/days/:date/flashback
 * Returns the user's reflection for the same calendar day one month and one
 * year earlier, skipping days that have no reflection content.
 */
export const getDayFlashback = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const date = req.params.date;

    const targets = [
      { key: "monthAgo", date: shiftDateBack(date, { months: 1 }) },
      { key: "yearAgo", date: shiftDateBack(date, { years: 1 }) },
    ];

    const docs = await DayTodo.find({
      userId,
      date: { $in: targets.map((t) => t.date) },
    }).lean();
    const byDate = new Map(docs.map((doc) => [doc.date, doc]));

    const flashbacks = targets
      .map((target) => {
        const doc = byDate.get(target.date);
        if (!doc) return null;
        const hasContent =
          Boolean(doc.reflection?.trim()) ||
          Boolean(doc.gratitude?.trim()) ||
          doc.mood != null;
        if (!hasContent) return null;
        return {
          key: target.key,
          date: doc.date,
          mood: doc.mood ?? null,
          energy: doc.energy ?? null,
          reflection: doc.reflection ?? "",
          gratitude: doc.gratitude ?? "",
        };
      })
      .filter((entry) => entry !== null);

    sendSuccess(res, 200, { flashbacks });
  }
);
