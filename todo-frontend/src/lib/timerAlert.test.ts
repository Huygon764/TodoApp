import { test, expect } from "bun:test";
import { timerAlertStep, type TimerAlertMemory } from "./timerAlert.js";
import type { TimerState } from "../types/stay.js";

const MIN = 60_000;
const T0 = Date.parse("2026-11-26T08:00:00.000Z");

function running(endsInMin: number, over: Partial<TimerState> = {}): TimerState {
  return {
    serverNow: new Date(T0).toISOString(),
    lengthMs: 10 * MIN,
    label: "",
    status: "running",
    endsAt: new Date(T0 + endsInMin * MIN).toISOString(),
    remainingMs: null,
    doneAt: null,
    ...over,
  };
}

const fresh = (): TimerAlertMemory => ({ armed: null, fired: null });

test("rings once when a counted-down timer reaches zero", () => {
  const m = fresh();
  const s = running(1);
  expect(timerAlertStep(m, s, T0)).toBe("silence");
  expect(timerAlertStep(m, s, T0 + MIN)).toBe("ring");
});

test("does not ring again on later ticks or a refetch of the same end", () => {
  const m = fresh();
  const s = running(1);
  timerAlertStep(m, s, T0);
  expect(timerAlertStep(m, s, T0 + MIN)).toBe("ring");
  expect(timerAlertStep(m, s, T0 + MIN + 1000)).toBe("idle");
  // A refetch returns an equal state object with the same endsAt.
  expect(timerAlertStep(m, running(1), T0 + MIN + 2000)).toBe("idle");
});

test("a timer already done on load never rings", () => {
  const m = fresh();
  const done = running(0, { status: "done", endsAt: null, doneAt: new Date(T0).toISOString() });
  expect(timerAlertStep(m, done, T0 + 5 * MIN)).toBe("idle");
  expect(m).toEqual({ armed: null, fired: null });
});

test("a running timer already past zero on load only settles", () => {
  const m = fresh();
  expect(timerAlertStep(m, running(-3), T0)).toBe("settle");
  expect(timerAlertStep(m, running(-3), T0 + 1000)).toBe("idle");
});

test("no state yet is idle", () => {
  expect(timerAlertStep(fresh(), null, T0)).toBe("idle");
});

test("+1m re-arms: the new end rings again", () => {
  const m = fresh();
  timerAlertStep(m, running(1), T0);
  expect(timerAlertStep(m, running(1), T0 + MIN)).toBe("ring");
  // Another device settles it, then the user dismisses and starts again.
  const later = T0 + 10 * MIN;
  const added = running(11, { endsAt: new Date(later + MIN).toISOString() });
  expect(timerAlertStep(m, added, later)).toBe("silence");
  expect(timerAlertStep(m, added, later + MIN)).toBe("ring");
});

test("adding time before zero moves the end and still rings once at the new end", () => {
  const m = fresh();
  timerAlertStep(m, running(1), T0 + 30_000);
  const added = running(2); // +1m while running
  expect(timerAlertStep(m, added, T0 + MIN)).toBe("silence");
  expect(timerAlertStep(m, added, T0 + 2 * MIN)).toBe("ring");
});

test("pause silences, and Resume (a new endsAt) arms again", () => {
  const m = fresh();
  timerAlertStep(m, running(1), T0);
  const paused = running(0, { status: "paused", endsAt: null, remainingMs: 30_000 });
  expect(timerAlertStep(m, paused, T0 + 30_000)).toBe("silence");
  const resumed = running(2);
  expect(timerAlertStep(m, resumed, T0 + 60_000)).toBe("silence");
  expect(timerAlertStep(m, resumed, T0 + 2 * MIN)).toBe("ring");
});

test("stopped silences", () => {
  const stopped = running(0, { status: "stopped", endsAt: null });
  expect(timerAlertStep(fresh(), stopped, T0)).toBe("silence");
});
