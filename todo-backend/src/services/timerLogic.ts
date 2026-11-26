import { badRequest, conflict } from "../utils/appError.js";

export type TimerStatus = "stopped" | "running" | "paused" | "done";

export const DEFAULT_TIMER_MS = 600_000; // 10 minutes
export const MIN_TIMER_MS = 60_000; // 1 minute
export const MAX_TIMER_MS = 86_400_000; // 24 hours
export const MAX_LABEL_LENGTH = 40;

export interface TimerData {
  lengthMs: number;
  label: string;
  status: TimerStatus;
  endsAt: Date | null;
  remainingMs: number | null;
  doneAt: Date | null;
}

export interface TimerState {
  serverNow: string;
  lengthMs: number;
  label: string;
  status: TimerStatus;
  endsAt: string | null;
  remainingMs: number | null;
  doneAt: string | null;
}

export function defaultTimer(): TimerData {
  return {
    lengthMs: DEFAULT_TIMER_MS,
    label: "",
    status: "stopped",
    endsAt: null,
    remainingMs: null,
    doneAt: null,
  };
}

/** A running timer whose end has passed becomes done at the instant it ended. */
export function settleTimer(t: TimerData, now: Date): TimerData {
  if (t.status !== "running" || !t.endsAt || t.endsAt.getTime() > now.getTime()) return t;
  return { ...t, status: "done", doneAt: t.endsAt, endsAt: null, remainingMs: null };
}

export function clampLength(ms: number): number {
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    throw badRequest("lengthMs must be a finite number");
  }
  return Math.min(MAX_TIMER_MS, Math.max(MIN_TIMER_MS, Math.round(ms)));
}

export function normalizeLabel(label: unknown): string {
  if (label === undefined || label === null) return "";
  if (typeof label !== "string") throw badRequest("label must be a string");
  const trimmed = label.trim();
  if (trimmed.length > MAX_LABEL_LENGTH) {
    throw badRequest(`label must be at most ${MAX_LABEL_LENGTH} characters`);
  }
  return trimmed;
}

export function startTimer(
  t: TimerData,
  now: Date,
  lengthMs: number,
  label?: unknown,
): TimerData {
  const length = clampLength(lengthMs);
  const text = normalizeLabel(label);
  if (t.status !== "stopped") throw conflict("Timer is not stopped");
  return {
    lengthMs: length,
    label: text,
    status: "running",
    endsAt: new Date(now.getTime() + length),
    remainingMs: null,
    doneAt: null,
  };
}

export function pauseTimer(t: TimerData, now: Date): TimerData {
  if (t.status !== "running" || !t.endsAt) throw conflict("Timer is not running");
  return {
    ...t,
    status: "paused",
    remainingMs: Math.max(0, t.endsAt.getTime() - now.getTime()),
    endsAt: null,
  };
}

export function resumeTimer(t: TimerData, now: Date): TimerData {
  if (t.status !== "paused" || t.remainingMs === null) throw conflict("Timer is not paused");
  return {
    ...t,
    status: "running",
    endsAt: new Date(now.getTime() + t.remainingMs),
    remainingMs: null,
  };
}

/** Add to the remaining time; the remaining time never exceeds 24 hours. */
export function addTimer(t: TimerData, now: Date, ms: number): TimerData {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) {
    throw badRequest("ms must be a positive number");
  }
  if (t.status === "running" && t.endsAt) {
    const remaining = Math.max(0, t.endsAt.getTime() - now.getTime());
    const next = Math.min(MAX_TIMER_MS, remaining + Math.round(ms));
    return { ...t, endsAt: new Date(now.getTime() + next) };
  }
  if (t.status === "paused" && t.remainingMs !== null) {
    return { ...t, remainingMs: Math.min(MAX_TIMER_MS, t.remainingMs + Math.round(ms)) };
  }
  throw conflict("Timer is not running or paused");
}

export function stopTimer(t: TimerData): TimerData {
  if (t.status !== "running" && t.status !== "paused") {
    throw conflict("Timer is not running or paused");
  }
  return { ...t, status: "stopped", endsAt: null, remainingMs: null, doneAt: null };
}

export function dismissTimer(t: TimerData): TimerData {
  if (t.status !== "done") throw conflict("Timer is not done");
  return { ...t, status: "stopped", label: "", endsAt: null, remainingMs: null, doneAt: null };
}

export function toTimerState(t: TimerData, now: Date): TimerState {
  return {
    serverNow: now.toISOString(),
    lengthMs: t.lengthMs,
    label: t.label,
    status: t.status,
    endsAt: t.status === "running" ? (t.endsAt?.toISOString() ?? null) : null,
    remainingMs: t.status === "paused" ? t.remainingMs : null,
    doneAt: t.status === "done" ? (t.doneAt?.toISOString() ?? null) : null,
  };
}
