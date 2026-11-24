import type { PomodoroState } from "@/types/stay";

export const POMODORO_PRESETS: readonly (readonly [number, number])[] = [
  [25, 5],
  [50, 10],
];
export const WORK_RANGE = { min: 1, max: 120 } as const;
export const REST_RANGE = { min: 1, max: 60 } as const;

function ms(iso: string | null): number | null {
  if (!iso) return null;
  const v = Date.parse(iso);
  return Number.isNaN(v) ? null : v;
}

export function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** 0 or 1 for the presets, 2 for anything else (Custom). */
export function presetIndex(workMin: number, restMin: number): number {
  const i = POMODORO_PRESETS.findIndex(([w, r]) => w === workMin && r === restMin);
  return i < 0 ? POMODORO_PRESETS.length : i;
}

export function phaseLengthMs(state: PomodoroState): number {
  return (state.phase === "rest" ? state.restMin : state.workMin) * 60_000;
}

/** Elapsed time in the current phase; 0 when idle. */
export function pomodoroElapsedMs(state: PomodoroState, nowMs: number): number {
  const start = ms(state.phaseStartedAt);
  if (state.phase === "idle" || start == null) return 0;
  const end = ms(state.pausedAt) ?? nowMs;
  return Math.max(0, end - start - state.pausedMs);
}

/** Remaining time in the phase; the full focus length when idle. */
export function pomodoroRemainingMs(state: PomodoroState, nowMs: number): number {
  if (state.phase === "idle") return state.workMin * 60_000;
  return Math.max(0, phaseLengthMs(state) - pomodoroElapsedMs(state, nowMs));
}

export function pomodoroPaused(state: PomodoroState): boolean {
  return state.phase !== "idle" && state.pausedAt != null;
}

/** The client countdown has hit zero while the stored phase has not advanced. */
export function pomodoroPhaseEnded(state: PomodoroState, nowMs: number): boolean {
  return (
    state.phase !== "idle" &&
    !pomodoroPaused(state) &&
    pomodoroRemainingMs(state, nowMs) <= 0
  );
}

/** Ring fill 0..1; 0 when idle. */
export function pomodoroProgress(state: PomodoroState, nowMs: number): number {
  if (state.phase === "idle") return 0;
  return Math.min(1, pomodoroElapsedMs(state, nowMs) / phaseLengthMs(state));
}
