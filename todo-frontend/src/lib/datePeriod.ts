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

/** Get Monday and Sunday of the week for a given period string (YYYY-Wnn). ISO week 1 = week containing Jan 4. */
export function getWeekDateRange(periodStr: string): { start: Date; end: Date } {
  const match = periodStr.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return { start: new Date(), end: new Date() };
  const [, yStr, wStr] = match;
  const year = parseInt(yStr!, 10);
  const week = parseInt(wStr!, 10);
  const jan4 = new Date(year, 0, 4);
  const dayOfJan4 = jan4.getDay() || 7; // Mon=1, Sun=7
  const mondayWeek1 = new Date(year, 0, 4 - dayOfJan4 + 1);
  const start = new Date(mondayWeek1);
  start.setDate(start.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

/** Format week period for display e.g. "Feb 17 – 23, 2026" */
export function formatWeekPeriodLabel(periodStr: string): string {
  const { start, end } = getWeekDateRange(periodStr);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth && sameYear) {
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  if (sameYear) {
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function getMonthPeriod(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** First and last week periods that touch the given month (YYYY-MM) */
export function getWeekRangeForMonth(monthStr: string): { from: string; to: string } {
  const [y, m] = monthStr.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);
  return {
    from: getWeekPeriod(firstDay),
    to: getWeekPeriod(lastDay),
  };
}

/** List week period strings from from to to (inclusive), using date iteration. */
export function getWeekPeriodsInRange(from: string, to: string): string[] {
  const { start } = getWeekDateRange(from);
  const { end } = getWeekDateRange(to);
  const out: string[] = [];
  const d = new Date(start);
  while (d <= end) {
    const p = getWeekPeriod(d);
    if (!out.includes(p)) out.push(p);
    d.setDate(d.getDate() + 7);
  }
  return out;
}

/** List of month options for dropdown (e.g. last 12 months) */
export function getMonthOptions(count = 12): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(getMonthPeriod(x));
  }
  return out;
}

/** Format month period for display e.g. "February 2026" */
export function formatMonthLabel(periodStr: string): string {
  const [y, m] = periodStr.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Prev/next week period (YYYY-Wnn) */
export function getPrevWeekPeriod(period: string): string {
  const { start } = getWeekDateRange(period);
  start.setDate(start.getDate() - 7);
  return getWeekPeriod(start);
}

export function getNextWeekPeriod(period: string): string {
  const { start } = getWeekDateRange(period);
  start.setDate(start.getDate() + 7);
  return getWeekPeriod(start);
}

/** Prev/next month period (YYYY-MM) */
export function getPrevMonthPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 2, 1); // m is 1-based, so m-2 = previous month
  return getMonthPeriod(d);
}

export function getNextMonthPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m, 1); // m is 1-based, month index m = next month
  return getMonthPeriod(d);
}

/** Year period as YYYY */
export function getYearPeriod(d: Date = new Date()): string {
  return String(d.getFullYear());
}

/** Prev/next year period */
export function getPrevYearPeriod(period: string): string {
  const y = parseInt(period, 10);
  return String(y - 1);
}

export function getNextYearPeriod(period: string): string {
  const y = parseInt(period, 10);
  return String(y + 1);
}

/** Format year for display */
export function formatYearLabel(period: string): string {
  return period;
}

/** Week options for picker: backWeeks + current + forwardWeeks */
export function getWeekOptionsForPicker(
  backWeeks = 2,
  forwardWeeks = 6
): { period: string; label: string }[] {
  const now = new Date();
  const current = getWeekPeriod(now);
  const { start } = getWeekDateRange(current);
  const startDate = new Date(start);
  startDate.setDate(startDate.getDate() - backWeeks * 7);
  const from = getWeekPeriod(startDate);
  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + forwardWeeks * 7);
  const to = getWeekPeriod(endDate);
  const periods = getWeekPeriodsInRange(from, to);
  return periods.map((p) => ({
    period: p,
    label: formatWeekPeriodLabel(p),
  }));
}

/** Month options for picker: backMonths + current + forwardMonths */
export function getMonthOptionsForPicker(
  backMonths = 1,
  forwardMonths = 6
): { period: string; label: string }[] {
  const out: { period: string; label: string }[] = [];
  const d = new Date();
  for (let i = -backMonths; i <= forwardMonths; i++) {
    const x = new Date(d.getFullYear(), d.getMonth() + i, 1);
    const p = getMonthPeriod(x);
    out.push({ period: p, label: formatMonthLabel(p) });
  }
  return out;
}

/** Year options for picker: backYears + current + forwardYears */
export function getYearOptionsForPicker(
  backYears = 1,
  forwardYears = 3
): { period: string; label: string }[] {
  const out: { period: string; label: string }[] = [];
  const y = new Date().getFullYear();
  for (let i = -backYears; i <= forwardYears; i++) {
    const p = String(y + i);
    out.push({ period: p, label: formatYearLabel(p) });
  }
  return out;
}
