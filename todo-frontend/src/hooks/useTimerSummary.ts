import { useNow, useStay } from "@/hooks/useStay";
import { usePomodoro } from "@/hooks/usePomodoro";
import { formatClock, stayRemainingMs } from "@/lib/stayClock";
import {
  pomodoroPaused,
  pomodoroRemainingMs,
} from "@/lib/pomodoroClock";
import type { DotState } from "@/components/stay/StateDot";
import type { StayStatus } from "@/types/stay";

export interface TimerSummary {
  stay: {
    status: StayStatus;
    dot: DotState;
    /** Running or paused: shows a countdown. */
    on: boolean;
    clock: string;
    level: number;
    escapes: number;
  };
  pomodoro: {
    /** Any phase but idle (running or paused). */
    on: boolean;
    dot: DotState;
    clock: string;
    phase: "idle" | "work" | "rest";
    paused: boolean;
  };
  /** Either timer is running or paused. */
  any: boolean;
  loaded: boolean;
}

/** What the chip, the mobile strip and the menu items show. */
export function useTimerSummary(): TimerSummary {
  const stay = useStay();
  const pomo = usePomodoro();

  const day = stay.state?.today ?? null;
  const p = pomo.state;
  const stayOn = day?.status === "running" || day?.status === "paused";
  const pomoOn = p != null && p.phase !== "idle";
  const pomoRunning = pomoOn && !pomodoroPaused(p);

  const stayNow = useNow(stay.offsetMs, day?.status === "running");
  const pomoNow = useNow(pomo.offsetMs, pomoRunning);

  const status: StayStatus = day?.status ?? "idle";
  const stayDot: DotState =
    status === "running" ? "run" : status === "paused" ? "pause" : status === "done" ? "done" : "idle";

  const pomoPaused = p != null && pomodoroPaused(p);
  const pomoDot: DotState = !pomoOn
    ? "idle"
    : pomoPaused
      ? "pause"
      : p.phase === "rest"
        ? "done"
        : "run";

  return {
    stay: {
      status,
      dot: stayDot,
      on: stayOn,
      clock: day ? formatClock(stayRemainingMs(day, stayNow)) : "",
      level: day?.level ?? 8,
      escapes: day?.escapes ?? 0,
    },
    pomodoro: {
      on: pomoOn,
      dot: pomoDot,
      clock: p ? formatClock(pomodoroRemainingMs(p, pomoNow), false) : "",
      phase: p?.phase ?? "idle",
      paused: pomoPaused,
    },
    any: stayOn || pomoOn,
    loaded: day != null && p != null,
  };
}
