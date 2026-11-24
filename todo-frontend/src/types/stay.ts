export type StayLevel = 6 | 8 | 12;
export type StayStatus = "idle" | "running" | "paused" | "done";
export type StayPauseReason = "escape" | "out";

export interface StayDayView {
  date: string; // YYYY-MM-DD
  level: StayLevel;
  status: StayStatus;
  /** Stayed up to the last transition, not including the running stretch. */
  stayedMs: number;
  runningSince: string | null;
  pausedAs: StayPauseReason | null;
  pausedSince: string | null;
  escapes: number;
  /** Out time up to the last transition, not including an open Out pause. */
  outMs: number;
  doneAt: string | null;
  /** True for a past day that was started but did not reach its level. */
  closed: boolean;
}

export interface StayState {
  serverNow: string;
  today: StayDayView;
  /** Monday of the current week to today, inclusive. */
  week: StayDayView[];
}

export type PomodoroPhase = "idle" | "work" | "rest";

export interface PomodoroState {
  serverNow: string;
  workMin: number;
  restMin: number;
  phase: PomodoroPhase;
  phaseStartedAt: string | null;
  /** Set while paused. */
  pausedAt: string | null;
  /** Paused time inside the current phase, not counting an open pause. */
  pausedMs: number;
  roundsToday: number;
}
