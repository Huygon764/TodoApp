import type { RecurringTemplateItem } from "@/types";

/** Matches backend dayService legacy week behavior (Monday-only when no schedule). */
export function isLegacyWeekItem(item: RecurringTemplateItem): boolean {
  return !Array.isArray(item.daysOfWeek) || item.daysOfWeek.length === 0;
}

/** Matches backend dayService legacy month behavior (1st-only when no schedule). */
export function isLegacyMonthItem(item: RecurringTemplateItem): boolean {
  return !Array.isArray(item.daysOfMonth) || item.daysOfMonth.length === 0;
}

/** Matches backend dayService legacy year behavior (Jan 1 only when no schedule). */
export function isLegacyYearItem(item: RecurringTemplateItem): boolean {
  return !Array.isArray(item.datesOfYear) || item.datesOfYear.length === 0;
}

export function isWeekItemVisible(
  item: RecurringTemplateItem,
  weekday: number,
): boolean {
  if (Array.isArray(item.daysOfWeek) && item.daysOfWeek.length > 0) {
    return item.daysOfWeek.includes(weekday);
  }
  return weekday === 1;
}

export function isMonthItemVisible(
  item: RecurringTemplateItem,
  dayOfMonth: number,
): boolean {
  if (Array.isArray(item.daysOfMonth) && item.daysOfMonth.length > 0) {
    return item.daysOfMonth.includes(dayOfMonth);
  }
  return dayOfMonth === 1;
}

export function isYearItemVisible(
  item: RecurringTemplateItem,
  ctx: { month: number; day: number },
): boolean {
  if (Array.isArray(item.datesOfYear) && item.datesOfYear.length > 0) {
    return item.datesOfYear.some(
      (d) => d.month === ctx.month && d.day === ctx.day,
    );
  }
  return ctx.month === 1 && ctx.day === 1;
}

export function isLegacyRecurringItem(
  tab: "week" | "month" | "year",
  item: RecurringTemplateItem,
): boolean {
  if (tab === "week") return isLegacyWeekItem(item);
  if (tab === "month") return isLegacyMonthItem(item);
  return isLegacyYearItem(item);
}
