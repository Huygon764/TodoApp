import { conflict } from "../utils/appError.js";
import { dateAt, mondayOf } from "../utils/zonedTime.js";

export type PomodoroPhase = "idle" | "work" | "rest";

export const DEFAULT_WORK_MIN = 25;
export const DEFAULT_REST_MIN = 5;
const MIN_MS = 60_000;

export interface PomodoroData {
  workMin: number;
  restMin: number;
  phase: PomodoroPhase;
  phaseStartedAt: Date | null;
  pausedAt: Date | null;
  pausedMs: number;
  roundsByDate: Record<string, number>;
}

export interface PomodoroState {
  serverNow: string;
  workMin: number;
  restMin: number;
  phase: PomodoroPhase;
  phaseStartedAt: string | null;
  pausedAt: string | null;
  pausedMs: number;
  roundsToday: number;
}

export function defaultPomodoro(): PomodoroData {
  return {
    workMin: DEFAULT_WORK_MIN,
    restMin: DEFAULT_REST_MIN,
    phase: "idle",
    phaseStartedAt: null,
    pausedAt: null,
    pausedMs: 0,
    roundsByDate: {},
  };
}

/**
 * Walk the phases forward from the stored timestamps. Each phase ends at the
 * exact instant its length is used up (paused time excluded); a finished work
 * phase counts a round on the date it ended in the user's timezone.
 */
export function advancePomodoro(
  p: PomodoroData,
  now: Date,
  tz?: string | null,
): PomodoroData {
  if (p.phase === "idle" || p.pausedAt || !p.phaseStartedAt) return p;

  let phase: "work" | "rest" = p.phase;
  let start = p.phaseStartedAt.getTime();
  let pausedMs = p.pausedMs;
  const rounds = { ...p.roundsByDate };
  let moved = false;

  for (;;) {
    const len = (phase === "work" ? p.workMin : p.restMin) * MIN_MS;
    const endAt = start + pausedMs + len;
    if (endAt > now.getTime()) break;
    if (phase === "work") {
      const date = dateAt(endAt, tz);
      rounds[date] = (rounds[date] ?? 0) + 1;
    }
    phase = phase === "work" ? "rest" : "work";
    start = endAt;
    pausedMs = 0;
    moved = true;
  }
  if (!moved) return p;
  return {
    ...p,
    phase,
    phaseStartedAt: new Date(start),
    pausedMs: 0,
    roundsByDate: rounds,
  };
}

/** Keep only the rounds of the current week (Monday in the user's timezone). */
export function pruneRounds(
  p: PomodoroData,
  now: Date,
  tz?: string | null,
): PomodoroData {
  const monday = mondayOf(dateAt(now.getTime(), tz));
  const kept: Record<string, number> = {};
  for (const [date, count] of Object.entries(p.roundsByDate)) {
    if (date >= monday) kept[date] = count;
  }
  return { ...p, roundsByDate: kept };
}

export function startPomodoro(p: PomodoroData, now: Date): PomodoroData {
  if (p.phase !== "idle") throw conflict("Pomodoro is already running");
  return { ...p, phase: "work", phaseStartedAt: now, pausedAt: null, pausedMs: 0 };
}

export function pausePomodoro(p: PomodoroData, now: Date): PomodoroData {
  if (p.phase === "idle" || p.pausedAt) throw conflict("Pomodoro is not running");
  return { ...p, pausedAt: now };
}

export function resumePomodoro(p: PomodoroData, now: Date): PomodoroData {
  if (p.phase === "idle" || !p.pausedAt) throw conflict("Pomodoro is not paused");
  return {
    ...p,
    pausedAt: null,
    pausedMs: p.pausedMs + Math.max(0, now.getTime() - p.pausedAt.getTime()),
  };
}

export function stopPomodoro(p: PomodoroData): PomodoroData {
  return { ...p, phase: "idle", phaseStartedAt: null, pausedAt: null, pausedMs: 0 };
}

export function setPomodoroSettings(
  p: PomodoroData,
  workMin: number,
  restMin: number,
): PomodoroData {
  if (p.phase !== "idle") throw conflict("The preset can only change while stopped");
  return { ...p, workMin, restMin };
}

export function toPomodoroState(
  p: PomodoroData,
  now: Date,
  tz?: string | null,
): PomodoroState {
  return {
    serverNow: now.toISOString(),
    workMin: p.workMin,
    restMin: p.restMin,
    phase: p.phase,
    phaseStartedAt: p.phaseStartedAt?.toISOString() ?? null,
    pausedAt: p.pausedAt?.toISOString() ?? null,
    pausedMs: p.pausedMs,
    roundsToday: p.roundsByDate[dateAt(now.getTime(), tz)] ?? 0,
  };
}
