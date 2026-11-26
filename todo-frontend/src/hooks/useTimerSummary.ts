import { useNow, useStay } from "@/hooks/useStay";
import { usePomodoro } from "@/hooks/usePomodoro";
import { useTimer } from "@/hooks/useTimer";
import { timerRemainingMs } from "@/lib/timerClock";
import { formatClock, stayRemainingMs } from "@/lib/stayClock";
import {
  pomodoroPaused,
  pomodoroRemainingMs,
} from "@/lib/pomodoroClock";
import {
  pomodoroDotState,
  stayDotState,
  timerDotState,
  type DotState,
} from "@/components/stay/StateDot";
import type { StayStatus, TimerStatus } from "@/types/stay";

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
  timer: {
    status: TimerStatus;
    /** Running, paused or done: shows in the chip, menu and strip. */
    on: boolean;
    dot: DotState;
    /** Remaining time; "" while done (the UI shows "Done"). */
    clock: string;
    label: string;
  };
  /** Any timer is running, paused or (for the countdown timer) done. */
  any: boolean;
  loaded: boolean;
}

/** What the chip, the mobile strip and the menu items show. */
export function useTimerSummary(): TimerSummary {
  const stay = useStay();
  const pomo = usePomodoro();
  const timer = useTimer();

  const tm = timer.state;
  const timerStatus: TimerStatus = tm?.status ?? "stopped";
  const timerOn = timerStatus !== "stopped";
  const timerNow = useNow(timer.offsetMs, timerStatus === "running");

  const day = stay.state?.today ?? null;
  const p = pomo.state;
  const stayOn = day?.status === "running" || day?.status === "paused";
  const pomoOn = p != null && p.phase !== "idle";
  const pomoRunning = pomoOn && !pomodoroPaused(p);

  const stayNow = useNow(stay.offsetMs, day?.status === "running");
  const pomoNow = useNow(pomo.offsetMs, pomoRunning);

  const status: StayStatus = day?.status ?? "idle";
  const stayDot = stayDotState(status);
  const pomoPaused = p != null && pomodoroPaused(p);
  const pomoDot = pomodoroDotState(p);

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
    timer: {
      status: timerStatus,
      on: timerOn,
      dot: timerDotState(timerStatus),
      clock: tm && timerStatus !== "done" ? formatClock(timerRemainingMs(tm, timerNow)) : "",
      label: tm?.label ?? "",
    },
    any: stayOn || pomoOn || timerOn,
    loaded: day != null && p != null,
  };
}
