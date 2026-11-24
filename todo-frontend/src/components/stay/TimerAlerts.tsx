import { useTimerAlerts } from "@/hooks/useTimerAlerts";

/** Renders nothing; keeps the per-second tick out of HomePage. */
export function TimerAlerts() {
  useTimerAlerts();
  return null;
}
