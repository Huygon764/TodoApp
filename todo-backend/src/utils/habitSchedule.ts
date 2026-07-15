/**
 * Pure date/streak helpers for habits. Everything works on "YYYY-MM-DD" strings
 * in the user's timezone (the caller resolves "today" via getTodayInTimeZone),
 * so these functions have no timezone or Date-now dependency and are fully
 * testable in isolation.
 */

export type HabitDayState = "done" | "missed" | "off";

/** ISO weekday for a date string: 1 = Monday .. 7 = Sunday. */
export function isoWeekday(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00Z");
  const jsDay = d.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  return ((jsDay + 6) % 7) + 1;
}

/** Shift a date string by `n` days (negative goes back). */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** A habit is scheduled on a date when the date's weekday is in daysOfWeek. */
export function isScheduled(dateStr: string, daysOfWeek: number[]): boolean {
  return daysOfWeek.includes(isoWeekday(dateStr));
}

/** Inclusive list of date strings from `from` to `to` (from <= to). */
export function enumerateDates(from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

interface StreakInput {
  today: string;
  daysOfWeek: number[];
  /** Set of "YYYY-MM-DD" dates that have a log. */
  logDates: Set<string>;
  /** Habit creation date ("YYYY-MM-DD"); dates before it never break a streak. */
  createdDate: string;
}

/**
 * Current streak: consecutive scheduled dates with a log, walking back from
 * today. Unscheduled dates are skipped (neither extend nor break). An un-ticked
 * *today* does not break the streak because the day is not over; any earlier
 * scheduled date without a log ends it. Dates before createdDate end the walk.
 */
export function computeStreak({ today, daysOfWeek, logDates, createdDate }: StreakInput): number {
  let streak = 0;
  let cursor = today;
  while (cursor >= createdDate) {
    if (isScheduled(cursor, daysOfWeek)) {
      if (logDates.has(cursor)) {
        streak += 1;
      } else if (cursor !== today) {
        break;
      }
      // Un-ticked today: grace, keep walking without incrementing.
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Longest run of consecutive scheduled dates with a log since createdDate,
 * inclusive of today. Never smaller than the current streak.
 */
export function computeBestStreak({ today, daysOfWeek, logDates, createdDate }: StreakInput): number {
  let best = 0;
  let run = 0;
  for (const date of enumerateDates(createdDate, today)) {
    if (!isScheduled(date, daysOfWeek)) continue;
    if (logDates.has(date)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  const current = computeStreak({ today, daysOfWeek, logDates, createdDate });
  return Math.max(best, current);
}

/**
 * Completion over a window: scheduled dates in [from, to] that are >= createdDate
 * are the denominator; those with a log are the numerator. `rate` is 0..1.
 */
export function computeRate(
  from: string,
  to: string,
  daysOfWeek: number[],
  logDates: Set<string>,
  createdDate: string,
): { scheduled: number; done: number; rate: number } {
  let scheduled = 0;
  let done = 0;
  for (const date of enumerateDates(from, to)) {
    if (date < createdDate) continue;
    if (!isScheduled(date, daysOfWeek)) continue;
    scheduled += 1;
    if (logDates.has(date)) done += 1;
  }
  return { scheduled, done, rate: scheduled === 0 ? 0 : done / scheduled };
}

/**
 * Per-day states for a window ending at `today`, oldest first (length = days).
 * A scheduled date is "done" if logged else "missed"; an unscheduled date, or
 * any date before createdDate, is "off". Today is reported by its true state;
 * the frontend renders the today cell specially so an un-ticked today does not
 * read as a hard miss.
 */
export function windowStates(
  today: string,
  days: number,
  daysOfWeek: number[],
  logDates: Set<string>,
  createdDate: string,
): { date: string; state: HabitDayState }[] {
  const from = addDays(today, -(days - 1));
  return enumerateDates(from, today).map((date) => {
    if (date < createdDate || !isScheduled(date, daysOfWeek)) {
      return { date, state: "off" as const };
    }
    return { date, state: logDates.has(date) ? "done" : "missed" };
  });
}
