import type { TimerState } from "@/types/stay";

export const TIMER_PRESETS_MIN: readonly number[] = [5, 10, 15, 30, 60];
export const TIMER_MIN_MS = 60_000;
export const TIMER_MAX_MS = 24 * 3_600_000;
export const TIMER_LABEL_MAX = 40;
export const TIMER_ADD_MINUTES: readonly number[] = [1, 5];

function ms(iso: string | null): number | null {
  if (!iso) return null;
  const v = Date.parse(iso);
  return Number.isNaN(v) ? null : v;
}

/** Index in the presets, or the Custom slot (presets.length) for any other length. */
export function timerPresetIndex(lengthMs: number): number {
  const i = TIMER_PRESETS_MIN.findIndex((m) => m * 60_000 === lengthMs);
  return i < 0 ? TIMER_PRESETS_MIN.length : i;
}

/** Hours and minutes inputs to a length, clamped to 1 minute..24 hours. Blank counts as 0. */
export function customLengthMs(hours: number, minutes: number): number {
  const h = Number.isFinite(hours) ? hours : 0;
  const m = Number.isFinite(minutes) ? minutes : 0;
  const total = Math.round(h * 60 + m) * 60_000;
  return Math.min(TIMER_MAX_MS, Math.max(TIMER_MIN_MS, total));
}

/** A length split into whole hours and minutes, for the Custom inputs. */
export function splitLength(lengthMs: number): { hours: number; minutes: number } {
  const totalMin = Math.round(lengthMs / 60_000);
  return { hours: Math.floor(totalMin / 60), minutes: totalMin % 60 };
}

/** Remaining time: counting down while running, frozen while paused, full length when stopped. */
export function timerRemainingMs(state: TimerState, nowMs: number): number {
  switch (state.status) {
    case "running": {
      const end = ms(state.endsAt);
      return end == null ? state.lengthMs : Math.max(0, end - nowMs);
    }
    case "paused":
      return Math.max(0, state.remainingMs ?? state.lengthMs);
    case "done":
      return 0;
    default:
      return state.lengthMs;
  }
}

/** The client countdown has hit zero while the stored state still says running. */
export function timerReachedZero(state: TimerState, nowMs: number): boolean {
  return state.status === "running" && timerRemainingMs(state, nowMs) <= 0;
}

/** Ring fill 0..1. Time added past the length widens the ring so it never runs backwards. */
export function timerProgress(state: TimerState, nowMs: number): number {
  if (state.status === "stopped") return 0;
  if (state.status === "done") return 1;
  const remaining = timerRemainingMs(state, nowMs);
  const total = Math.max(state.lengthMs, remaining);
  return Math.min(1, Math.max(0, 1 - remaining / total));
}
