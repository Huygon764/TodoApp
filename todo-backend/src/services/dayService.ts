import { DefaultItem, RecurringTemplate, DateTemplate } from "../models/index.js";
import type { IDayTodoItem, IRecurringTemplateItem } from "../types/index.js";

/** Parse YYYY-MM-DD to Date at noon UTC for weekday/monthday checks */
export function parseDateString(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00Z");
}

/** Convert template subTasks ({ title }) to DayTodo subTasks ({ title, completed }) */
function convertSubTasks(
  subTasks?: { title: string }[]
): IDayTodoItem["subTasks"] {
  if (!Array.isArray(subTasks) || subTasks.length === 0) return undefined;
  return subTasks.map((st) => ({ title: st.title, completed: false }));
}

/** Append items from source to existing items if title not already present (by trimmed title, case-sensitive) */
export function mergeItemsByTitle(
  existing: IDayTodoItem[],
  source: { title: string; subTasks?: { title: string }[] }[],
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
      toAppend.push({
        title: sourceItem.title,
        completed: false,
        order: startOrder + toAppend.length,
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
): Promise<{ title: string; subTasks?: { title: string }[] }[]> {
  const types = ["week", "month", "year"] as const;
  const templates = await RecurringTemplate.find({ userId, type: { $in: types } });

  const filtered: { title: string; subTasks?: { title: string }[] }[] = [];
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
  let items: IDayTodoItem[] = defaultItems.map((defaultItem, index) => ({
    title: defaultItem.title,
    completed: false,
    order: index,
    subTasks: convertSubTasks(defaultItem.subTasks),
  }));

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
