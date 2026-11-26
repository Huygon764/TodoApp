import type { TimerState } from "@/types/stay";
import { timerReachedZero, timerRemainingMs } from "@/lib/timerClock";

/** What this tab has seen of the timer, keyed by `endsAt`. */
export interface TimerAlertMemory {
  /** The end this tab saw with time left. */
  armed: string | null;
  /** The end this tab already reacted to at zero. */
  fired: string | null;
}

export type TimerAlertAction =
  /** Nothing to do. */
  | "idle"
  /** Not at zero: make sure no sound is playing. */
  | "silence"
  /** Reached zero in this open tab: play the sound, show the toast, refetch. */
  | "ring"
  /** Reached zero but this tab never saw it count down (reload): refetch only. */
  | "settle";

/**
 * One step of the zero watch. A zero rings only if this tab saw that end with
 * time left, and only once per end: a refetch, a reload or a timer already
 * done on load never rings. +1m/+5m or Resume give a new `endsAt`, which arms
 * again. Mutates `memory`.
 */
export function timerAlertStep(
  memory: TimerAlertMemory,
  state: TimerState | null,
  nowMs: number,
): TimerAlertAction {
  if (!state || state.status === "done") return "idle";
  if (state.status !== "running") return "silence";
  const key = state.endsAt ?? "";
  if (!timerReachedZero(state, nowMs)) {
    if (timerRemainingMs(state, nowMs) > 0) memory.armed = key;
    return "silence";
  }
  if (memory.fired === key) return "idle";
  memory.fired = key;
  return memory.armed === key ? "ring" : "settle";
}
