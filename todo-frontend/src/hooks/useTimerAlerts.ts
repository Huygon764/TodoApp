import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNow, useStay } from "@/hooks/useStay";
import { usePomodoro } from "@/hooks/usePomodoro";
import { useTimer } from "@/hooks/useTimer";
import { stayReachedZero, stayRemainingMs } from "@/lib/stayClock";
import { pomodoroPaused, pomodoroPhaseEnded } from "@/lib/pomodoroClock";
import { timerAlertStep, type TimerAlertMemory } from "@/lib/timerAlert";
import { playSound, playSoundRepeated, stopRepeatedSound } from "@/lib/sounds";
import { showToast } from "@/lib/toast";

const RETRY_REFETCH_MS = 2000;
const TIMER_RING_TIMES = 5;
const TIMER_RING_GAP_MS = 300;

/**
 * Sounds and toasts for transitions the open tab watches happen: the client
 * countdown crossing zero. A key is "armed" only after this tab saw it with
 * time left, so a transition that happened while the app was closed (or a
 * first load) plays nothing. After a transition the state is re-fetched.
 */
export function useTimerAlerts() {
  const { t } = useTranslation();
  const stay = useStay();
  const pomo = usePomodoro();
  const timer = useTimer();

  const timerState = timer.state;
  const timerRunning = timerState?.status === "running";
  const timerNow = useNow(timer.offsetMs, timerRunning);
  const timerMemory = useRef<TimerAlertMemory>({ armed: null, fired: null });
  const refetchTimer = timer.refetch;

  const stayDay = stay.state?.today ?? null;
  const pomoState = pomo.state;
  const stayRunning = stayDay?.status === "running";
  const pomoRunning =
    pomoState != null && pomoState.phase !== "idle" && !pomodoroPaused(pomoState);

  const stayNow = useNow(stay.offsetMs, stayRunning);
  const pomoNow = useNow(pomo.offsetMs, pomoRunning);

  const stayArmed = useRef<string | null>(null);
  const stayFired = useRef<string | null>(null);
  const pomoArmed = useRef<string | null>(null);
  const pomoFired = useRef<string | null>(null);

  const refetchStay = stay.refetch;
  const refetchPomo = pomo.refetch;

  useEffect(() => {
    if (!stayDay || stayDay.status !== "running") return;
    const key = `${stayDay.date}|${stayDay.runningSince}`;
    if (!stayReachedZero(stayDay, stayNow)) {
      if (stayRemainingMs(stayDay, stayNow) > 0) stayArmed.current = key;
      return;
    }
    if (stayFired.current === key) return;
    stayFired.current = key;
    if (stayArmed.current === key) {
      playSound("rest-start");
      showToast(t("stay.doneToast", { count: stayDay.escapes, level: stayDay.level }));
    }
    void refetchStay();
    // Not cleared on re-run: this effect re-runs every tick and would cancel it.
    setTimeout(() => void refetchStay(), RETRY_REFETCH_MS);
  }, [stayDay, stayNow, refetchStay, t]);

  useEffect(() => {
    if (!pomoState || pomoState.phase === "idle" || pomodoroPaused(pomoState)) return;
    const key = `${pomoState.phase}|${pomoState.phaseStartedAt}`;
    if (!pomodoroPhaseEnded(pomoState, pomoNow)) {
      pomoArmed.current = key;
      return;
    }
    if (pomoFired.current === key) return;
    pomoFired.current = key;
    if (pomoArmed.current === key) {
      if (pomoState.phase === "work") {
        playSound("rest-start");
        showToast(t("pomodoro.focusDoneToast", { rest: pomoState.restMin }));
      } else {
        playSound("work-start");
        showToast(t("pomodoro.restDoneToast", { work: pomoState.workMin }));
      }
    }
    void refetchPomo();
    setTimeout(() => void refetchPomo(), RETRY_REFETCH_MS);
  }, [pomoState, pomoNow, refetchPomo, t]);

  // Keyed by endsAt, see timerAlertStep.
  useEffect(() => {
    const action = timerAlertStep(timerMemory.current, timerState, timerNow);
    if (action === "idle" || !timerState) return;
    if (action === "silence") {
      stopRepeatedSound(); // dismissed, stopped or paused from another device
      return;
    }
    if (action === "ring") {
      playSoundRepeated("rest-start", TIMER_RING_TIMES, TIMER_RING_GAP_MS);
      showToast(
        timerState.label
          ? t("timer.doneToastLabel", { label: timerState.label })
          : t("timer.doneToast"),
      );
    }
    void refetchTimer();
    setTimeout(() => void refetchTimer(), RETRY_REFETCH_MS);
  }, [timerState, timerNow, refetchTimer, t]);
}
