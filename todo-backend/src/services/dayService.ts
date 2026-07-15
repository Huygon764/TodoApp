import { DefaultItem, RecurringTemplate, DateTemplate, DayTodo } from "../models/index.js";
import type { IDayTodoItem, IRecurringTemplateItem } from "../types/index.js";

/** Parse YYYY-MM-DD to Date at noon UTC for weekday/monthday checks */
export function parseDateString(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00Z");
}

/** A counter target copied from a template; below 2 it is not a counter. */
function normalizeTarget(target?: number): number | undefined {
  return typeof target === "number" && target >= 2 ? target : undefined;
}

/** Convert template subTasks ({ title, target? }) to DayTodo subTasks ({ title, completed, count }) */
function convertSubTasks(
  subTasks?: { title: string; target?: number }[]
): IDayTodoItem["subTasks"] {
  if (!Array.isArray(subTasks) || subTasks.length === 0) return undefined;
  return subTasks.map((st) => {
    const target = normalizeTarget(st.target);
    return target
      ? { title: st.title, completed: false, target, count: 0 }
      : { title: st.title, completed: false };
  });
}

/** Append items from source to existing items if title not already present (by trimmed title, case-sensitive) */
export function mergeItemsByTitle(
  existing: IDayTodoItem[],
  source: { title: string; target?: number; subTasks?: { title: string; target?: number }[] }[],
  startOrder: number
): IDayTodoItem[] {
  const existingTitles = new Set(
    existing.map((it) => (it.title ?? "").trim())
  );
  const toAppend: IDayTodoItem[] = [];
  for (const sourceItem of source) {
    const trimmedTitle = (sourceItem.title ?? "").trim();
    if (trimmedTitle && !existingTitles.has(trimmedTitle)) {
      existingTitles.add(trimmedTitle);
      const target = normalizeTarget(sourceItem.target);
      toAppend.push({
        title: sourceItem.title,
        completed: false,
        order: startOrder + toAppend.length,
        ...(target ? { target, count: 0 } : {}),
        subTasks: convertSubTasks(sourceItem.subTasks),
      });
    }
  }
  return existing.length === 0 && toAppend.length === 0
    ? existing
    : [...existing, ...toAppend];
}

/** Map JS weekday (0=Sun..6=Sat) to 1-7 with 1=Monday, 7=Sunday */
export function toWeekdayIndexMondayFirst(dateObj: Date): number {
  const jsDay = dateObj.getUTCDay(); // 0-6
  return ((jsDay + 6) % 7) + 1; // 1-7
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
      (dateEntry) => dateEntry.month === month && dateEntry.day === dayOfMonth
    );
  }
  // For legacy items without schedule, default to 1/1 only
  return month === 1 && dayOfMonth === 1;
}

/** Fetch recurring templates (week/month/year) and filter items by the given date's schedule */
export async function fetchAndFilterTemplateItems(
  userId: string,
  weekdayIndex: number,
  isMonday: boolean,
  dayOfMonth: number,
  isFirstOfMonth: boolean,
  month: number
): Promise<{ title: string; target?: number; subTasks?: { title: string; target?: number }[] }[]> {
  const types = ["week", "month", "year"] as const;
  const templates = await RecurringTemplate.find({ userId, type: { $in: types } });

  const filtered: { title: string; target?: number; subTasks?: { title: string; target?: number }[] }[] = [];
  for (const tpl of templates) {
    for (const item of tpl.items) {
      let include = false;
      if (tpl.type === "week") include = shouldIncludeWeeklyItem(item, weekdayIndex, isMonday);
      else if (tpl.type === "month") include = shouldIncludeMonthlyItem(item, dayOfMonth, isFirstOfMonth);
      else if (tpl.type === "year") include = shouldIncludeYearlyItem(item, month, dayOfMonth);
      if (include) filtered.push(item);
    }
  }
  return filtered;
}

/** Build initial day items from default items, recurring templates, and date-specific template */
export async function initializeDayItems(
  userId: string,
  date: string,
  weekdayIndex: number,
  isMonday: boolean,
  dayOfMonth: number,
  isFirstOfMonth: boolean,
  month: number
): Promise<IDayTodoItem[]> {
  const defaultItems = await DefaultItem.find({ userId }).sort({ order: 1 });
  let items: IDayTodoItem[] = defaultItems.map((defaultItem, index) => {
    const target = normalizeTarget(defaultItem.target);
    return {
      title: defaultItem.title,
      completed: false,
      order: index,
      ...(target ? { target, count: 0 } : {}),
      subTasks: convertSubTasks(defaultItem.subTasks),
    };
  });

  const recurringItems = await fetchAndFilterTemplateItems(
    userId, weekdayIndex, isMonday, dayOfMonth, isFirstOfMonth, month
  );
  if (recurringItems.length) {
    items = mergeItemsByTitle(items, recurringItems, items.length);
  }

  const dateTemplate = await DateTemplate.findOne({ userId, date });
  if (dateTemplate?.items?.length) {
    items = mergeItemsByTitle(items, dateTemplate.items, items.length);
  }

  return items;
}

/** Merge missing items from all sources (default, recurring, date template) into an existing day */
export async function mergeNewItemsIntoExistingDay(
  currentItems: IDayTodoItem[],
  userId: string,
  date: string,
  weekdayIndex: number,
  isMonday: boolean,
  dayOfMonth: number,
  isFirstOfMonth: boolean,
  month: number
): Promise<{ items: IDayTodoItem[]; modified: boolean }> {
  let items = currentItems;
  let modified = false;

  // Merge missing default items on every GET
  const defaultItems = await DefaultItem.find({ userId }).sort({ order: 1 });
  const afterDefault = mergeItemsByTitle(items, defaultItems, items.length);
  if (afterDefault.length !== items.length) {
    items = afterDefault;
    modified = true;
  }

  // Merge recurring templates (week / month / year) based on schedule
  const recurringItems = await fetchAndFilterTemplateItems(
    userId, weekdayIndex, isMonday, dayOfMonth, isFirstOfMonth, month
  );
  if (recurringItems.length) {
    const before = items.length;
    items = mergeItemsByTitle(items, recurringItems, items.length);
    if (items.length !== before) modified = true;
  }

  // Merge date-specific template items
  const dateTemplate = await DateTemplate.findOne({ userId, date });
  if (dateTemplate?.items?.length) {
    const before = items.length;
    items = mergeItemsByTitle(items, dateTemplate.items, items.length);
    if (items.length !== before) modified = true;
  }

  return { items, modified };
}

/**
 * Carry incomplete tasks forward from the most recent prior day.
 * - Looks at the latest DayTodo with date < target, so skipped days still
 *   pull from the last day the user actually used.
 * - Dedups by trimmed title: a title already present today (from any source
 *   or a previous GET) is left untouched. This keeps the operation
 *   idempotent, so refreshing the same day never inflates postponeCount.
 * - Each carried item keeps the earliest known carriedFrom and bumps
 *   postponeCount by 1. Completed tasks are not carried.
 * - Only runs for the user's today or a past day. Viewing a future day
 *   must not prematurely materialize today's unfinished tasks there
 *   (the source day is not over yet).
 */
export async function mergeCarryOverItems(
  currentItems: IDayTodoItem[],
  userId: string,
  date: string,
  today: string
): Promise<{ items: IDayTodoItem[]; modified: boolean }> {
  if (date > today) {
    return { items: currentItems, modified: false };
  }

  const prevDay = await DayTodo.findOne({
    userId,
    date: { $lt: date },
  }).sort({ date: -1 });

  if (!prevDay || !prevDay.items?.length) {
    return { items: currentItems, modified: false };
  }

  const existingTitles = new Set(
    currentItems.map((it) => (it.title ?? "").trim())
  );

  const toAppend: IDayTodoItem[] = [];
  for (const prevItem of prevDay.items) {
    if (prevItem.completed) continue;
    const trimmedTitle = (prevItem.title ?? "").trim();
    if (!trimmedTitle || existingTitles.has(trimmedTitle)) continue;
    existingTitles.add(trimmedTitle);
    const target = normalizeTarget(prevItem.target);
    toAppend.push({
      title: prevItem.title,
      completed: false,
      order: currentItems.length + toAppend.length,
      ...(target ? { target, count: 0 } : {}),
      subTasks: Array.isArray(prevItem.subTasks)
        ? prevItem.subTasks.map((st) => {
            const stTarget = normalizeTarget(st.target);
            return stTarget
              ? { title: st.title, completed: false, target: stTarget, count: 0 }
              : { title: st.title, completed: false };
          })
        : undefined,
      carriedFrom: prevItem.carriedFrom ?? prevDay.date,
      postponeCount: (prevItem.postponeCount ?? 0) + 1,
    });
  }

  if (toAppend.length === 0) {
    return { items: currentItems, modified: false };
  }
  return { items: [...currentItems, ...toAppend], modified: true };
}
