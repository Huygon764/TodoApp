/**
 * ISO 8601 week: returns year and week number for a date (week contains Thursday).
 */
function getISOWeek(date: Date): { year: number; week: number } {
  const dateCopy = new Date(date.getTime());
  dateCopy.setDate(dateCopy.getDate() + 4 - (dateCopy.getDay() || 7));
  const yearStart = new Date(dateCopy.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((dateCopy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return { year: dateCopy.getFullYear(), week: weekNo };
}

export function getWeekPeriod(date: Date = new Date()): string {
  const { year, week } = getISOWeek(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function getMonthPeriod(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Monday = 1, Sunday = 7 in getDay() with (date.getDay() || 7) */
export function isFirstDayOfWeek(date: Date = new Date()): boolean {
  return (date.getDay() || 7) === 1;
}

export function isFirstDayOfMonth(date: Date = new Date()): boolean {
  return date.getDate() === 1;
}

/** Year period as YYYY */
export function getYearPeriod(date: Date = new Date()): string {
  return String(date.getFullYear());
}

/** True if date is January 1st */
export function isFirstDayOfYear(date: Date = new Date()): boolean {
  return date.getMonth() === 0 && date.getDate() === 1;
}

/** Week range (from/to) that touches the given month (YYYY-MM) */
export function getWeekRangeForMonth(monthStr: string): { from: string; to: string } {
  const [year, month] = monthStr.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  return {
    from: getWeekPeriod(firstDay),
    to: getWeekPeriod(lastDay),
  };
}

/** Get Monday and Sunday of the week for period string (YYYY-Wnn). ISO week 1 = week containing Jan 4. */
export function getWeekDateRange(periodStr: string): { start: Date; end: Date } {
  const match = periodStr.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return { start: new Date(), end: new Date() };
  const [, yStr, wStr] = match;
  const year = parseInt(yStr!, 10);
  const week = parseInt(wStr!, 10);
  const jan4 = new Date(year, 0, 4);
  const dayOfJan4 = jan4.getDay() || 7;
  const mondayWeek1 = new Date(year, 0, 4 - dayOfJan4 + 1);
  const start = new Date(mondayWeek1);
  start.setDate(start.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

/**
 * Today's date as YYYY-MM-DD in the given IANA timezone. Falls back to
 * Asia/Ho_Chi_Minh (the app default) if the timezone is missing/invalid.
 */
export function getTodayInTimeZone(tz?: string | null): string {
  const zone = tz || "Asia/Ho_Chi_Minh";
  try {
    // en-CA formats as YYYY-MM-DD
    return new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(
      new Date()
    );
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date());
  }
}

/** Format a Date as local YYYY-MM-DD (matches how DayTodo.date is stored) */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Inclusive YYYY-MM-DD day range covered by a week/month review period */
export function getPeriodDayRange(
  type: "week" | "month",
  period: string
): { start: string; end: string } | null {
  if (type === "week") {
    if (!/^\d{4}-W\d{2}$/.test(period)) return null;
    const { start, end } = getWeekDateRange(period);
    return { start: toDateStr(start), end: toDateStr(end) };
  }
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1]!, 10);
  const month = parseInt(match[2]!, 10);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  return { start: toDateStr(first), end: toDateStr(last) };
}

/** List week period strings from from to to (inclusive). */
export function getWeekPeriodsInRange(fromWeek: string, toWeek: string): string[] {
  const { start } = getWeekDateRange(fromWeek);
  const { end } = getWeekDateRange(toWeek);
  const out: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const period = getWeekPeriod(cursor);
    if (!out.includes(period)) out.push(period);
    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}

/** List month period strings (YYYY-MM) from fromMonth to toMonth (inclusive). */
export function getMonthsInRange(fromMonth: string, toMonth: string): string[] {
  const [fromYear, fromMo] = fromMonth.split("-").map(Number);
  const [toYear, toMo] = toMonth.split("-").map(Number);
  const out: string[] = [];
  let year = fromYear;
  let month = fromMo;
  while (year < toYear || (year === toYear && month <= toMo)) {
    out.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
}
