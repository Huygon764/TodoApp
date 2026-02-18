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
