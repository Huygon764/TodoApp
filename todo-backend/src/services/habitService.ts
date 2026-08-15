import { Habit, HabitLog } from "../models/index.js";
import type { IHabitDocument, HabitLogKind } from "../types/index.js";
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

function createdDateOf(habit: IHabitDocument, tz?: string | null): string {
  return formatDateInTimeZone(habit.createdAt, tz);
}

function logKind(kind?: HabitLogKind | null): HabitLogKind {
  return kind === "skipped" ? "skipped" : "done";
}

interface SplitLogs {
  done: Set<string>;
  skip: Set<string>;
}

async function logsByHabit(
  userId: string,
  habitIds: string[],
): Promise<Map<string, SplitLogs>> {
  const logs = await HabitLog.find({
    userId,
    habitId: { $in: habitIds },
  }).select("habitId date kind");
  const map = new Map<string, SplitLogs>();
  for (const id of habitIds) map.set(id, { done: new Set(), skip: new Set() });
  for (const log of logs) {
    const split = map.get(String(log.habitId));
    if (!split) continue;
    if (logKind(log.kind)) {
      if (logKind(log.kind) === "skipped") split.skip.add(log.date);
      else split.done.add(log.date);
    }
  }
  return map;
}

function assertMutableDate(date: string, today: string): void {
  if (date !== today && date !== addDays(today, -1)) {
    throw new Error("DATE_NOT_ALLOWED");
  }
}

export interface HabitTodayEntry {
  id: string;
  name: string;
  daysOfWeek: number[];
  order: number;
  doneToday: boolean;
  skippedToday: boolean;
  streak: number;
  last7: { date: string; state: HabitDayState }[];
}

export async function getTodayPanel(
  userId: string,
  tz?: string | null,
  panelDate?: string,
): Promise<{ today: string; date: string; habits: HabitTodayEntry[] }> {
  const today = formatDateInTimeZone(new Date(), tz);
  const date = panelDate ?? today;
  const habits = await Habit.find({ userId, archivedAt: null }).sort({ order: 1 });
  const scheduled = habits.filter((h) => isScheduled(date, h.daysOfWeek));

  const logs = await logsByHabit(
    userId,
    scheduled.map((h) => String(h._id)),
  );

  const entries = scheduled.map((h) => {
    const id = String(h._id);
    const split = logs.get(id) ?? { done: new Set<string>(), skip: new Set<string>() };
    const createdDate = createdDateOf(h, tz);
    return {
      id,
      name: h.name,
      daysOfWeek: h.daysOfWeek,
      order: h.order,
      doneToday: split.done.has(date),
      skippedToday: split.skip.has(date),
      streak: computeStreak({
        today,
        daysOfWeek: h.daysOfWeek,
        logDates: split.done,
        skipDates: split.skip,
        createdDate,
      }),
      last7: windowStates(date, 7, h.daysOfWeek, split.done, createdDate, split.skip),
    };
  });

  return { today, date, habits: entries };
}

export async function listHabits(userId: string): Promise<IHabitDocument[]> {
  return Habit.find({ userId, archivedAt: null }).sort({ order: 1 });
}

export async function toggleDone(
  userId: string,
  habitId: string,
  tz?: string | null,
  date?: string,
): Promise<{ date: string; done: boolean; skipped: boolean }> {
  const habit = await Habit.findOne({ _id: habitId, userId, archivedAt: null });
  if (!habit) throw new Error("NOT_FOUND");

  const today = formatDateInTimeZone(new Date(), tz);
  const target = date ?? today;
  assertMutableDate(target, today);
  if (!isScheduled(target, habit.daysOfWeek)) {
    throw new Error("NOT_SCHEDULED");
  }

  const existing = await HabitLog.findOne({ userId, habitId, date: target });
  if (existing && logKind(existing.kind) === "done") {
    await existing.deleteOne();
    return { date: target, done: false, skipped: false };
  }
  if (existing) {
    existing.kind = "done";
    await existing.save();
  } else {
    await HabitLog.create({ userId, habitId, date: target, kind: "done" });
  }
  return { date: target, done: true, skipped: false };
}

export async function toggleSkip(
  userId: string,
  habitId: string,
  tz?: string | null,
  date?: string,
): Promise<{ date: string; done: boolean; skipped: boolean }> {
  const habit = await Habit.findOne({ _id: habitId, userId, archivedAt: null });
  if (!habit) throw new Error("NOT_FOUND");

  const today = formatDateInTimeZone(new Date(), tz);
  const target = date ?? today;
  assertMutableDate(target, today);
  if (!isScheduled(target, habit.daysOfWeek)) {
    throw new Error("NOT_SCHEDULED");
  }

  const existing = await HabitLog.findOne({ userId, habitId, date: target });
  if (existing && logKind(existing.kind) === "skipped") {
    await existing.deleteOne();
    return { date: target, done: false, skipped: false };
  }
  if (existing) {
    existing.kind = "skipped";
    await existing.save();
  } else {
    await HabitLog.create({ userId, habitId, date: target, kind: "skipped" });
  }
  return { date: target, done: false, skipped: true };
}

export async function skipDay(
  userId: string,
  tz?: string | null,
  date?: string,
): Promise<{ date: string; skipped: number }> {
  const today = formatDateInTimeZone(new Date(), tz);
  const target = date ?? today;
  assertMutableDate(target, today);

  const habits = await Habit.find({ userId, archivedAt: null });
  const scheduled = habits.filter((h) => isScheduled(target, h.daysOfWeek));
  let skipped = 0;
  for (const habit of scheduled) {
    const existing = await HabitLog.findOne({ userId, habitId: habit._id, date: target });
    if (existing && logKind(existing.kind) === "done") continue;
    if (existing && logKind(existing.kind) === "skipped") continue;
    if (existing) {
      existing.kind = "skipped";
      await existing.save();
    } else {
      await HabitLog.create({ userId, habitId: habit._id, date: target, kind: "skipped" });
    }
    skipped += 1;
  }
  return { date: target, skipped };
}

export async function unskipDay(
  userId: string,
  tz?: string | null,
  date?: string,
): Promise<{ date: string; removed: number }> {
  const today = formatDateInTimeZone(new Date(), tz);
  const target = date ?? today;
  assertMutableDate(target, today);

  const result = await HabitLog.deleteMany({ userId, date: target, kind: "skipped" });
  return { date: target, removed: result.deletedCount ?? 0 };
}

export interface HabitStatsEntry {
  id: string;
  name: string;
  streak: number;
  bestStreak: number;
  rate30: number;
  skips30: number;
  days: { date: string; state: HabitDayState }[];
}

export interface HabitStats {
  overall: {
    bestStreak: number;
    rate30: number;
    perfectDays30: number;
    totalDays: number;
    skips30: number;
  };
  habits: HabitStatsEntry[];
  worst: { id: string; name: string; rate30: number; breaks30: number } | null;
}

function countBreaks(
  from: string,
  to: string,
  daysOfWeek: number[],
  logDates: Set<string>,
  createdDate: string,
  today: string,
  skipDates: Set<string>,
): number {
  const states = windowStates(
    today,
    daysBetween(from, to) + 1,
    daysOfWeek,
    logDates,
    createdDate,
    skipDates,
  );
  return states.filter((s) => s.state === "missed" && s.date !== today).length;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + "T12:00:00Z").getTime();
  const b = new Date(to + "T12:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

function countSkips(from: string, to: string, skip: Set<string>, createdDate: string): number {
  let n = 0;
  for (const date of skip) {
    if (date >= from && date <= to && date >= createdDate) n += 1;
  }
  return n;
}

export async function getStats(
  userId: string,
  days: number,
  tz?: string | null,
): Promise<HabitStats> {
  const today = formatDateInTimeZone(new Date(), tz);
  const from30 = addDays(today, -29);

  const habits = await Habit.find({ userId, archivedAt: null }).sort({ order: 1 });
  const logs = await logsByHabit(userId, habits.map((h) => String(h._id)));

  const entries: HabitStatsEntry[] = habits.map((h) => {
    const id = String(h._id);
    const split = logs.get(id) ?? { done: new Set<string>(), skip: new Set<string>() };
    const createdDate = createdDateOf(h, tz);
    const rate30 = computeRate(from30, today, h.daysOfWeek, split.done, createdDate, split.skip).rate;
    return {
      id,
      name: h.name,
      streak: computeStreak({
        today,
        daysOfWeek: h.daysOfWeek,
        logDates: split.done,
        skipDates: split.skip,
        createdDate,
      }),
      bestStreak: computeBestStreak({
        today,
        daysOfWeek: h.daysOfWeek,
        logDates: split.done,
        skipDates: split.skip,
        createdDate,
      }),
      rate30,
      skips30: countSkips(from30, today, split.skip, createdDate),
      days: windowStates(today, days, h.daysOfWeek, split.done, createdDate, split.skip),
    };
  });

  const bestStreak = entries.reduce((m, e) => Math.max(m, e.bestStreak), 0);
  const rate30 =
    entries.length === 0
      ? 0
      : entries.reduce((sum, e) => sum + e.rate30, 0) / entries.length;
  const skips30 = entries.reduce((sum, e) => sum + e.skips30, 0);

  let perfectDays30 = 0;
  for (let i = 0; i < 30; i++) {
    const date = addDays(today, -i);
    const scheduled = habits.filter(
      (h) => isScheduled(date, h.daysOfWeek) && date >= createdDateOf(h, tz),
    );
    const countable = scheduled.filter((h) => {
      const split = logs.get(String(h._id));
      return !split?.skip.has(date);
    });
    if (countable.length === 0) continue;
    const allDone = countable.every((h) =>
      (logs.get(String(h._id))?.done ?? new Set()).has(date),
    );
    if (allDone) perfectDays30 += 1;
  }

  let worst: HabitStats["worst"] = null;
  for (const h of habits) {
    const id = String(h._id);
    const split = logs.get(id) ?? { done: new Set<string>(), skip: new Set<string>() };
    const createdDate = createdDateOf(h, tz);
    const rate = computeRate(from30, today, h.daysOfWeek, split.done, createdDate, split.skip).rate;
    const breaks = countBreaks(from30, today, h.daysOfWeek, split.done, createdDate, today, split.skip);
    if (worst === null || rate < worst.rate30) {
      worst = { id, name: h.name, rate30: rate, breaks30: breaks };
    }
  }

  return {
    overall: { bestStreak, rate30, perfectDays30, totalDays: days, skips30 },
    habits: entries,
    worst,
  };
}
