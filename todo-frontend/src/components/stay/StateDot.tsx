import { pomodoroPaused } from "@/lib/pomodoroClock";
import type { PomodoroState, StayStatus } from "@/types/stay";

export type DotState = "idle" | "run" | "pause" | "done";

const DOT_CLASS: Record<DotState, string> = {
  idle: "bg-text-muted",
  run: "bg-accent-hover",
  pause: "bg-pause",
  done: "bg-done",
};

export function StateDot({ state }: { state: DotState }) {
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_CLASS[state]}`} />;
}

/** Dot for a Stay status; needs no clock. */
export function stayDotState(status: StayStatus): DotState {
  return status === "running"
    ? "run"
    : status === "paused"
      ? "pause"
      : status === "done"
        ? "done"
        : "idle";
}

/** Dot for the pomodoro; needs no clock. */
export function pomodoroDotState(p: PomodoroState | null): DotState {
  if (!p || p.phase === "idle") return "idle";
  if (pomodoroPaused(p)) return "pause";
  return p.phase === "rest" ? "done" : "run";
}
