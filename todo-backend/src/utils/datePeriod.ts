/**
 * ISO 8601 week: returns year and week number for a date (week contains Thursday).
 */
function getISOWeek(d: Date): { year: number; week: number } {
  const date = new Date(d.getTime());
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return { year: date.getFullYear(), week: weekNo };
}

export function getWeekPeriod(d: Date = new Date()): string {
  const { year, week } = getISOWeek(d);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function getMonthPeriod(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Monday = 1, Sunday = 7 in getDay() with (d.getDay() || 7) */
export function isFirstDayOfWeek(d: Date = new Date()): boolean {
  return (d.getDay() || 7) === 1;
}

export function isFirstDayOfMonth(d: Date = new Date()): boolean {
  return d.getDate() === 1;
}

/** Year period as YYYY */
export function getYearPeriod(d: Date = new Date()): string {
  return String(d.getFullYear());
}

/** True if date is January 1st */
export function isFirstDayOfYear(d: Date = new Date()): boolean {
  return d.getMonth() === 0 && d.getDate() === 1;
}

/** Week range (from/to) that touches the given month (YYYY-MM) */
export function getWeekRangeForMonth(monthStr: string): { from: string; to: string } {
  const [y, m] = monthStr.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);
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

/** List week period strings from from to to (inclusive). */
export function getWeekPeriodsInRange(fromWeek: string, toWeek: string): string[] {
  const { start } = getWeekDateRange(fromWeek);
  const { end } = getWeekDateRange(toWeek);
  const out: string[] = [];
  const d = new Date(start);
  while (d <= end) {
    const p = getWeekPeriod(d);
    if (!out.includes(p)) out.push(p);
    d.setDate(d.getDate() + 7);
  }
  return out;
}

/** List month period strings (YYYY-MM) from fromMonth to toMonth (inclusive). */
export function getMonthsInRange(fromMonth: string, toMonth: string): string[] {
  const [fy, fm] = fromMonth.split("-").map(Number);
  const [ty, tm] = toMonth.split("-").map(Number);
  const out: string[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}
