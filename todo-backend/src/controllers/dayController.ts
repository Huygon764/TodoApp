import type { Request, Response } from "express";
import { DayTodo, DefaultItem, RecurringTemplate, DateTemplate } from "../models/index.js";
import { catchAsync, sendSuccess, notFound } from "../utils/index.js";
import { MESSAGES } from "../constants/index.js";
import type { IDayTodoItem, IRecurringTemplateItem } from "../types/index.js";
import { isFirstDayOfWeek, isFirstDayOfMonth } from "../utils/datePeriod.js";

/** Parse YYYY-MM-DD to Date at noon UTC for weekday/monthday checks */
function parseDateString(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00Z");
}

/** Convert template subTasks ({ title }) to DayTodo subTasks ({ title, completed }) */
function convertSubTasks(
  subTasks?: { title: string }[]
): IDayTodoItem["subTasks"] {
  if (!Array.isArray(subTasks) || subTasks.length === 0) return undefined;
  return subTasks.map((st) => ({ title: st.title, completed: false }));
}

/** Append items from source to dayTodo.items if title not already present (by trimmed title, case-sensitive) */
function mergeItemsByTitle(
  existing: IDayTodoItem[],
  source: { title: string; subTasks?: { title: string }[] }[],
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
        subTasks: convertSubTasks(s.subTasks),
      });
    }
  }
  return existing.length === 0 && toAppend.length === 0
    ? existing
    : [...existing, ...toAppend];
}

/** Map JS weekday (0=Sun..6=Sat) to 1-7 with 1=Monday, 7=Sunday */
function toWeekdayIndexMondayFirst(d: Date): number {
  const js = d.getUTCDay(); // 0-6
  return ((js + 6) % 7) + 1; // 1-7
}

function shouldIncludeWeeklyItem(
  item: IRecurringTemplateItem,
  weekdayIndex: number,
  isMonday: boolean
): boolean {
  if (Array.isArray(item.daysOfWeek) && item.daysOfWeek.length > 0) {
    return item.daysOfWeek.includes(weekdayIndex);
  }
  // Backward compatibility: items without schedule behave like Monday-only
  return isMonday;
}

function shouldIncludeMonthlyItem(
  item: IRecurringTemplateItem,
  dayOfMonth: number,
  isFirstOfMonth: boolean
): boolean {
  if (Array.isArray(item.daysOfMonth) && item.daysOfMonth.length > 0) {
    return item.daysOfMonth.includes(dayOfMonth);
  }
  // Backward compatibility: items without schedule behave like day-1-only
  return isFirstOfMonth;
}

function shouldIncludeYearlyItem(
  item: IRecurringTemplateItem,
  month: number,
  dayOfMonth: number
): boolean {
  if (Array.isArray(item.datesOfYear) && item.datesOfYear.length > 0) {
    return item.datesOfYear.some(
      (d) => d.month === month && d.day === dayOfMonth
    );
  }
  // For legacy items without schedule, default to 1/1 only
  return month === 1 && dayOfMonth === 1;
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
  const weekdayIndex = toWeekdayIndexMondayFirst(dateObj);
  const dayOfMonth = dateObj.getUTCDate();
  const month = dateObj.getUTCMonth() + 1;

  let dayTodo = await DayTodo.findOne({ userId, date });

  if (!dayTodo) {
    const defaultItems = await DefaultItem.find({ userId }).sort({ order: 1 });
    let items: IDayTodoItem[] = defaultItems.map((d, i) => ({
      title: d.title,
      completed: false,
      order: i,
      subTasks: convertSubTasks(d.subTasks),
    }));

    // Recurring templates: week / month / year, filtered by schedule
    const weekTemplate = await RecurringTemplate.findOne({
      userId,
      type: "week",
    });
    if (weekTemplate?.items?.length) {
      const weeklyItems = weekTemplate.items.filter((it) =>
        shouldIncludeWeeklyItem(it, weekdayIndex, isMonday)
      );
      if (weeklyItems.length) {
        items = mergeItemsByTitle(items, weeklyItems, items.length);
      }
    }

    const monthTemplate = await RecurringTemplate.findOne({
      userId,
      type: "month",
    });
    if (monthTemplate?.items?.length) {
      const monthlyItems = monthTemplate.items.filter((it) =>
        shouldIncludeMonthlyItem(it, dayOfMonth, isFirstOfMonth)
      );
      if (monthlyItems.length) {
        items = mergeItemsByTitle(items, monthlyItems, items.length);
      }
    }

    const yearTemplate = await RecurringTemplate.findOne({
      userId,
      type: "year",
    });
    if (yearTemplate?.items?.length) {
      const yearlyItems = yearTemplate.items.filter((it) =>
        shouldIncludeYearlyItem(it, month, dayOfMonth)
      );
      if (yearlyItems.length) {
        items = mergeItemsByTitle(items, yearlyItems, items.length);
      }
    }
    const dateTemplate = await DateTemplate.findOne({ userId, date });
    if (dateTemplate?.items?.length) {
      items = mergeItemsByTitle(items, dateTemplate.items, items.length);
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

    // List 2: merge recurring templates (week / month / year) based on schedule
    const weekTemplate = await RecurringTemplate.findOne({
      userId,
      type: "week",
    });
    if (weekTemplate?.items?.length) {
      const weeklyItems = weekTemplate.items.filter((it) =>
        shouldIncludeWeeklyItem(it, weekdayIndex, isMonday)
      );
      if (weeklyItems.length) {
        const before = dayTodo.items.length;
        dayTodo.items = mergeItemsByTitle(
          dayTodo.items,
          weeklyItems,
          dayTodo.items.length
        );
        if (dayTodo.items.length !== before) modified = true;
      }
    }

    const monthTemplate = await RecurringTemplate.findOne({
      userId,
      type: "month",
    });
    if (monthTemplate?.items?.length) {
      const monthlyItems = monthTemplate.items.filter((it) =>
        shouldIncludeMonthlyItem(it, dayOfMonth, isFirstOfMonth)
      );
      if (monthlyItems.length) {
        const before = dayTodo.items.length;
        dayTodo.items = mergeItemsByTitle(
          dayTodo.items,
          monthlyItems,
          dayTodo.items.length
        );
        if (dayTodo.items.length !== before) modified = true;
      }
    }

    const yearTemplate = await RecurringTemplate.findOne({
      userId,
      type: "year",
    });
    if (yearTemplate?.items?.length) {
      const yearlyItems = yearTemplate.items.filter((it) =>
        shouldIncludeYearlyItem(it, month, dayOfMonth)
      );
      if (yearlyItems.length) {
        const before = dayTodo.items.length;
        dayTodo.items = mergeItemsByTitle(
          dayTodo.items,
          yearlyItems,
          dayTodo.items.length
        );
        if (dayTodo.items.length !== before) modified = true;
      }
    }

    const dateTemplate = await DateTemplate.findOne({ userId, date });
    if (dateTemplate?.items?.length) {
      const before = dayTodo.items.length;
      dayTodo.items = mergeItemsByTitle(
        dayTodo.items,
        dateTemplate.items,
        dayTodo.items.length
      );
      if (dayTodo.items.length !== before) modified = true;
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
      subTasks: Array.isArray(item.subTasks)
        ? item.subTasks.map((st) => ({
            title: st.title ?? "",
            completed: Boolean(st.completed),
          }))
        : undefined,
    }));
    await dayTodo.save();
  }

  sendSuccess(res, 200, { dayTodo });
});
