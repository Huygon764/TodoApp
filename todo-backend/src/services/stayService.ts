import { StayDay } from "../models/index.js";
import type { IStayDayDocument } from "../types/index.js";
import { formatDateInTimeZone } from "../utils/datePeriod.js";
import { dateRange, mondayOf } from "../utils/zonedTime.js";
import {
  idleDay,
  settleDay,
  toView,
  type StayData,
  type StayDayView,
} from "./stayLogic.js";

export interface StayState {
  serverNow: string;
  today: StayDayView;
  week: StayDayView[];
}

function toData(doc: IStayDayDocument): StayData {
  return {
    date: doc.date,
    level: doc.level,
    status: doc.status,
    stayedMs: doc.stayedMs,
    runningSince: doc.runningSince ?? null,
    pausedAs: doc.pausedAs ?? null,
    pausedSince: doc.pausedSince ?? null,
    escapes: doc.escapes,
    outMs: doc.outMs,
    levelChanges: (doc.levelChanges ?? []).map((c) => ({
      at: c.at,
      from: c.from,
      to: c.to,
    })),
    doneAt: doc.doneAt ?? null,
    startedAt: doc.startedAt ?? null,
  };
}

function applyData(doc: IStayDayDocument, data: StayData): void {
  doc.set({ ...data, date: doc.date });
}

/**
 * Settle every day of the week, optionally apply one write to today, and
 * return the state. Reads and writes share this path so a write always starts
 * from settled data.
 */
export async function runStay(
  userId: string,
  tz: string | null | undefined,
  mutate?: (today: StayData, now: Date) => StayData,
  now: Date = new Date(),
): Promise<StayState> {
  const today = formatDateInTimeZone(now, tz);
  const dates = dateRange(mondayOf(today), today);

  const docs = await StayDay.find({ userId, date: { $in: dates } });
  const byDate = new Map<string, IStayDayDocument>(docs.map((d) => [d.date, d]));

  if (!byDate.has(today)) {
    const created = await StayDay.findOneAndUpdate(
      { userId, date: today },
      { $setOnInsert: { level: 8, status: "idle" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    byDate.set(today, created!);
  }

  const views: StayData[] = [];
  for (const date of dates) {
    const doc = byDate.get(date);
    if (!doc) {
      views.push(idleDay(date));
      continue;
    }
    const before = toData(doc);
    let data = settleDay(before, now, tz, today);
    if (date === today && mutate) data = mutate(data, now);
    if (data !== before) {
      applyData(doc, data);
      await doc.save();
    }
    views.push(data);
  }

  const week = views.map((d) => toView(d, today));
  return {
    serverNow: now.toISOString(),
    today: week[week.length - 1]!,
    week,
  };
}
