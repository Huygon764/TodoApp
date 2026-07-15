import { Habit, HabitLog } from "../models/index.js";
import type { IHabitDocument } from "../types/index.js";
import { formatDateInTimeZone } from "../utils/datePeriod.js";
import {
  isScheduled,
  addDays,
  computeStreak,
  computeBestStreak,
  computeRate,
  windowStates,
  type HabitDayState,
} from "../utils/habitSchedule.js";

/** The habit's creation date as a YYYY-MM-DD string in the user's timezone. */
function createdDateOf(habit: IHabitDocument, tz?: string | null): string {
  return formatDateInTimeZone(habit.createdAt, tz);
}

/** Load every log date for a set of habits, grouped into a Set per habit id. */
async function logDatesByHabit(
  userId: string,
  habitIds: string[],
): Promise<Map<string, Set<string>>> {
  const logs = await HabitLog.find({
    userId,
    habitId: { $in: habitIds },
  }).select("habitId date");
  const map = new Map<string, Set<string>>();
  for (const id of habitIds) map.set(id, new Set());
  for (const log of logs) {
    map.get(String(log.habitId))?.add(log.date);
  }
  return map;
}

export interface HabitTodayEntry {
  id: string;
  name: string;
  daysOfWeek: number[];
  order: number;
  doneToday: boolean;
  streak: number;
  last7: { date: string; state: HabitDayState }[];
}

/** Panel data: active habits scheduled today, with today's tick, streak, last 7. */
export async function getTodayPanel(
  userId: string,
  tz?: string | null,
): Promise<{ today: string; habits: HabitTodayEntry[] }> {
  const today = formatDateInTimeZone(new Date(), tz);
  const habits = await Habit.find({ userId, archivedAt: null }).sort({ order: 1 });
  const scheduledToday = habits.filter((h) => isScheduled(today, h.daysOfWeek));

  const logsByHabit = await logDatesByHabit(
    userId,
    scheduledToday.map((h) => String(h._id)),
  );

  const entries = scheduledToday.map((h) => {
    const id = String(h._id);
    const logDates = logsByHabit.get(id) ?? new Set<string>();
    const createdDate = createdDateOf(h, tz);
    return {
      id,
      name: h.name,
      daysOfWeek: h.daysOfWeek,
      order: h.order,
      doneToday: logDates.has(today),
      streak: computeStreak({ today, daysOfWeek: h.daysOfWeek, logDates, createdDate }),
      last7: windowStates(today, 7, h.daysOfWeek, logDates, createdDate),
    };
  });

  return { today, habits: entries };
}

/** All active habits (management modal). */
export async function listHabits(userId: string): Promise<IHabitDocument[]> {
  return Habit.find({ userId, archivedAt: null }).sort({ order: 1 });
}

/**
 * Tick or untick today for a habit. Returns the new done state. Throws
 * "NOT_SCHEDULED" if the habit is not scheduled today (callers map to 400).
 */
export async function toggleToday(
  userId: string,
  habitId: string,
  tz?: string | null,
): Promise<{ date: string; done: boolean }> {
  const habit = await Habit.findOne({ _id: habitId, userId, archivedAt: null });
  if (!habit) throw new Error("NOT_FOUND");

  const today = formatDateInTimeZone(new Date(), tz);
  if (!isScheduled(today, habit.daysOfWeek)) {
    throw new Error("NOT_SCHEDULED");
  }

  const existing = await HabitLog.findOne({ userId, habitId, date: today });
  if (existing) {
    await existing.deleteOne();
    return { date: today, done: false };
  }
  await HabitLog.create({ userId, habitId, date: today });
  return { date: today, done: true };
}

export interface HabitStatsEntry {
  id: string;
  name: string;
  streak: number;
  bestStreak: number;
  rate30: number;
  days: { date: string; state: HabitDayState }[];
}

export interface HabitStats {
  overall: { bestStreak: number; rate30: number; perfectDays30: number; totalDays: number };
  habits: HabitStatsEntry[];
  worst: { id: string; name: string; rate30: number; breaks30: number } | null;
}

/** Count breaks in a window: scheduled+unlogged days (excluding today) since createdDate. */
function countBreaks(
  from: string,
  to: string,
  daysOfWeek: number[],
  logDates: Set<string>,
  createdDate: string,
  today: string,
): number {
  const states = windowStates(
    today,
    // enumerate exactly [from, to] by width
    daysBetween(from, to) + 1,
    daysOfWeek,
    logDates,
    createdDate,
  );
  return states.filter((s) => s.state === "missed" && s.date !== today).length;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + "T12:00:00Z").getTime();
  const b = new Date(to + "T12:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

/** Stats modal: per-habit heatmap window plus overall KPIs and the worst habit. */
export async function getStats(
  userId: string,
  days: number,
  tz?: string | null,
): Promise<HabitStats> {
  const today = formatDateInTimeZone(new Date(), tz);
  const from30 = addDays(today, -29);

  const habits = await Habit.find({ userId, archivedAt: null }).sort({ order: 1 });
  const logsByHabit = await logDatesByHabit(userId, habits.map((h) => String(h._id)));

  const entries: HabitStatsEntry[] = habits.map((h) => {
    const id = String(h._id);
    const logDates = logsByHabit.get(id) ?? new Set<string>();
    const createdDate = createdDateOf(h, tz);
    const rate30 = computeRate(from30, today, h.daysOfWeek, logDates, createdDate).rate;
    return {
      id,
      name: h.name,
      streak: computeStreak({ today, daysOfWeek: h.daysOfWeek, logDates, createdDate }),
      bestStreak: computeBestStreak({ today, daysOfWeek: h.daysOfWeek, logDates, createdDate }),
      rate30,
      days: windowStates(today, days, h.daysOfWeek, logDates, createdDate),
    };
  });

  const bestStreak = entries.reduce((m, e) => Math.max(m, e.bestStreak), 0);
  const rate30 =
    entries.length === 0
      ? 0
      : entries.reduce((sum, e) => sum + e.rate30, 0) / entries.length;

  // Perfect day: every habit scheduled that day was logged (over the last 30).
  let perfectDays30 = 0;
  for (let i = 0; i < 30; i++) {
    const date = addDays(today, -i);
    const scheduled = habits.filter(
      (h) => isScheduled(date, h.daysOfWeek) && date >= createdDateOf(h, tz),
    );
    if (scheduled.length === 0) continue;
    const allDone = scheduled.every((h) =>
      (logsByHabit.get(String(h._id)) ?? new Set()).has(date),
    );
    if (allDone) perfectDays30 += 1;
  }

  let worst: HabitStats["worst"] = null;
  for (const h of habits) {
    const id = String(h._id);
    const logDates = logsByHabit.get(id) ?? new Set<string>();
    const createdDate = createdDateOf(h, tz);
    const rate = computeRate(from30, today, h.daysOfWeek, logDates, createdDate).rate;
    const breaks = countBreaks(from30, today, h.daysOfWeek, logDates, createdDate, today);
    if (worst === null || rate < worst.rate30) {
      worst = { id, name: h.name, rate30: rate, breaks30: breaks };
    }
  }

  return {
    overall: { bestStreak, rate30, perfectDays30, totalDays: days },
    habits: entries,
    worst,
  };
}
