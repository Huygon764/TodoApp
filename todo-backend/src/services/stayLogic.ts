import { conflict } from "../utils/appError.js";
import { zonedMidnightMs, addDays } from "../utils/zonedTime.js";

export type StayLevel = 6 | 8 | 12;
export type StayStatus = "idle" | "running" | "paused" | "done";
export type StayPauseReason = "escape" | "out";

export const STAY_LEVELS: readonly StayLevel[] = [6, 8, 12];
export const DEFAULT_STAY_LEVEL: StayLevel = 8;
const HOUR_MS = 3_600_000;

export interface StayData {
  date: string;
  level: StayLevel;
  status: StayStatus;
  stayedMs: number;
  runningSince: Date | null;
  pausedAs: StayPauseReason | null;
  pausedSince: Date | null;
  escapes: number;
  outMs: number;
  levelChanges: { at: Date; from: StayLevel; to: StayLevel }[];
  doneAt: Date | null;
  /** Set by Start; lets a past day that never reached its level read as closed. */
  startedAt: Date | null;
}

export interface StayDayView {
  date: string;
  level: StayLevel;
  status: StayStatus;
  stayedMs: number;
  runningSince: string | null;
  pausedAs: StayPauseReason | null;
  pausedSince: string | null;
  escapes: number;
  outMs: number;
  doneAt: string | null;
  closed: boolean;
}

export const levelMs = (level: StayLevel): number => level * HOUR_MS;

export function idleDay(date: string): StayData {
  return {
    date,
    level: DEFAULT_STAY_LEVEL,
    status: "idle",
    stayedMs: 0,
    runningSince: null,
    pausedAs: null,
    pausedSince: null,
    escapes: 0,
    outMs: 0,
    levelChanges: [],
    doneAt: null,
    startedAt: null,
  };
}

/** Time stayed as of `now`, including the running stretch. */
export function stayedAt(day: StayData, now: Date): number {
  if (day.status === "running" && day.runningSince) {
    return day.stayedMs + Math.max(0, now.getTime() - day.runningSince.getTime());
  }
  return day.stayedMs;
}

/**
 * Apply the time-driven transitions: a running countdown that reached zero is
 * done at that instant, and a day before `today` is closed at its midnight.
 * Returns the same object when nothing changed.
 */
export function settleDay(
  day: StayData,
  now: Date,
  tz: string | null | undefined,
  today: string,
): StayData {
  if (day.status !== "running" && day.status !== "paused") return day;

  const isPast = day.date < today;
  const cutoff = isPast
    ? Math.min(now.getTime(), zonedMidnightMs(addDays(day.date, 1), tz))
    : now.getTime();
  const total = levelMs(day.level);

  if (day.status === "running" && day.runningSince) {
    const reachedAt = day.runningSince.getTime() + (total - day.stayedMs);
    if (reachedAt <= cutoff) {
      return {
        ...day,
        status: "done",
        stayedMs: total,
        runningSince: null,
        doneAt: new Date(reachedAt),
      };
    }
    if (!isPast) return day;
    return closeDay({
      ...day,
      stayedMs: day.stayedMs + (cutoff - day.runningSince.getTime()),
    });
  }

  if (!isPast) return day;
  let outMs = day.outMs;
  if (day.pausedAs === "out" && day.pausedSince) {
    outMs += Math.max(0, cutoff - day.pausedSince.getTime());
  }
  return closeDay({ ...day, outMs });
}

/** A past day that did not reach its level: keep the counts, stop the clock. */
function closeDay(day: StayData): StayData {
  return {
    ...day,
    status: "idle",
    runningSince: null,
    pausedAs: null,
    pausedSince: null,
  };
}

export function startDay(day: StayData, now: Date): StayData {
  if (day.status !== "idle") throw conflict("Stay can only start when not started");
  return { ...day, status: "running", runningSince: now, startedAt: now };
}

export function pauseDay(
  day: StayData,
  reason: StayPauseReason,
  now: Date,
): StayData {
  if (day.status !== "running") throw conflict("Stay is not running");
  return {
    ...day,
    status: "paused",
    stayedMs: stayedAt(day, now),
    runningSince: null,
    pausedAs: reason,
    pausedSince: now,
    escapes: day.escapes + (reason === "escape" ? 1 : 0),
  };
}

export function resumeDay(day: StayData, now: Date): StayData {
  if (day.status !== "paused") throw conflict("Stay is not paused");
  const outMs =
    day.outMs +
    (day.pausedAs === "out" && day.pausedSince
      ? Math.max(0, now.getTime() - day.pausedSince.getTime())
      : 0);
  return {
    ...day,
    status: "running",
    runningSince: now,
    pausedAs: null,
    pausedSince: null,
    outMs,
  };
}

export function changeLevel(day: StayData, level: StayLevel, now: Date): StayData {
  if (day.status === "done") throw conflict("The level is locked once Stay is done");
  if (day.status === "idle") {
    if (level === day.level) return day;
    return {
      ...day,
      level,
      levelChanges: [...day.levelChanges, { at: now, from: day.level, to: level }],
    };
  }
  if (level >= day.level) {
    throw conflict("After Start the level can only go down");
  }
  const stayed = stayedAt(day, now);
  const next: StayData = {
    ...day,
    level,
    levelChanges: [...day.levelChanges, { at: now, from: day.level, to: level }],
  };
  if (levelMs(level) > stayed) return next;

  const outMs =
    day.outMs +
    (day.status === "paused" && day.pausedAs === "out" && day.pausedSince
      ? Math.max(0, now.getTime() - day.pausedSince.getTime())
      : 0);
  return {
    ...next,
    status: "done",
    stayedMs: stayed,
    runningSince: null,
    pausedAs: null,
    pausedSince: null,
    outMs,
    doneAt: now,
  };
}

export function toView(day: StayData, today: string): StayDayView {
  return {
    date: day.date,
    level: day.level,
    status: day.status,
    stayedMs: day.stayedMs,
    runningSince: day.runningSince?.toISOString() ?? null,
    pausedAs: day.pausedAs,
    pausedSince: day.pausedSince?.toISOString() ?? null,
    escapes: day.escapes,
    outMs: day.outMs,
    doneAt: day.doneAt?.toISOString() ?? null,
    closed: day.date < today && day.status === "idle" && day.startedAt !== null,
  };
}
