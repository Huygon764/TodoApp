import { test, expect } from "bun:test";
import {
  defaultTimer,
  startTimer,
  pauseTimer,
  resumeTimer,
  addTimer,
  stopTimer,
  dismissTimer,
  settleTimer,
  toTimerState,
  type TimerData,
} from "./timerLogic.js";

const M = 60_000;
const H = 60 * M;
const T0 = new Date("2026-11-26T01:00:00Z");
const at = (ms: number) => new Date(T0.getTime() + ms);
const running = (len = 10 * M): TimerData => startTimer(defaultTimer(), T0, len);

function statusOf(fn: () => unknown): number | undefined {
  try {
    fn();
  } catch (e) {
    return (e as { statusCode?: number }).statusCode;
  }
  return undefined;
}

test("defaults: stopped, 10 minutes, no label", () => {
  const t = defaultTimer();
  expect([t.status, t.lengthMs, t.label]).toEqual(["stopped", 10 * M, ""]);
});

test("start sets endsAt and saves length and label (trimmed)", () => {
  const t = startTimer(defaultTimer(), T0, 5 * M, "  Cooking ");
  expect(t.status).toBe("running");
  expect(t.endsAt!.toISOString()).toBe(at(5 * M).toISOString());
  expect([t.lengthMs, t.label]).toEqual([5 * M, "Cooking"]);
});

test("countdown from timestamps across pause and resume", () => {
  const p = pauseTimer(running(10 * M), at(4 * M));
  expect(p.status).toBe("paused");
  expect(p.remainingMs).toBe(6 * M);
  expect(p.endsAt).toBeNull();
  // time passing while paused does not count
  const r = resumeTimer(p, at(100 * M));
  expect(r.status).toBe("running");
  expect(r.remainingMs).toBeNull();
  expect(r.endsAt!.toISOString()).toBe(at(106 * M).toISOString());
  expect(settleTimer(r, at(105 * M))).toBe(r);
  expect(settleTimer(r, at(106 * M)).status).toBe("done");
});

test("+1m and +5m while running", () => {
  const a = addTimer(addTimer(running(10 * M), at(2 * M), M), at(2 * M), 5 * M);
  expect(a.endsAt!.toISOString()).toBe(at(16 * M).toISOString());
});

test("+1m and +5m while paused", () => {
  const p = pauseTimer(running(10 * M), at(4 * M));
  const a = addTimer(addTimer(p, at(50 * M), M), at(50 * M), 5 * M);
  expect(a.status).toBe("paused");
  expect(a.remainingMs).toBe(12 * M);
});

test("remaining time is capped at 24 hours, running and paused", () => {
  const r = addTimer(running(23 * H), at(0), 5 * H);
  expect(r.endsAt!.getTime() - T0.getTime()).toBe(24 * H);
  const p = addTimer(pauseTimer(running(23 * H), T0), T0, 5 * H);
  expect(p.remainingMs).toBe(24 * H);
});

test("zero reached while no request comes settles to done on the next read", () => {
  const t = running(10 * M);
  const s = settleTimer(t, at(3 * H));
  expect(s.status).toBe("done");
  expect(s.doneAt!.toISOString()).toBe(at(10 * M).toISOString());
  expect(s.endsAt).toBeNull();
  const state = toTimerState(s, at(3 * H));
  expect([state.status, state.endsAt, state.remainingMs]).toEqual(["done", null, null]);
  expect(state.doneAt).toBe(at(10 * M).toISOString());
});

test("dismiss returns to stopped with the same length and an empty label", () => {
  const done = settleTimer(startTimer(defaultTimer(), T0, 15 * M, "Nap"), at(20 * M));
  const d = dismissTimer(done);
  expect(d.status).toBe("stopped");
  expect(d.lengthMs).toBe(15 * M);
  expect(d.label).toBe("");
  expect(d.doneAt).toBeNull();
});

test("stop keeps the length and the label", () => {
  const s = stopTimer(startTimer(defaultTimer(), T0, 15 * M, "Nap"));
  expect([s.status, s.lengthMs, s.label, s.endsAt]).toEqual(["stopped", 15 * M, "Nap", null]);
});

test("start is refused (409) unless stopped", () => {
  const done = settleTimer(running(M), at(2 * M));
  for (const t of [running(), pauseTimer(running(), T0), done]) {
    expect(statusOf(() => startTimer(t, T0, 5 * M))).toBe(409);
  }
});

test("add is refused (409) unless running or paused", () => {
  const done = settleTimer(running(M), at(2 * M));
  expect(statusOf(() => addTimer(defaultTimer(), T0, M))).toBe(409);
  expect(statusOf(() => addTimer(done, T0, M))).toBe(409);
});

test("pause, resume, stop and dismiss are refused (409) in the wrong state", () => {
  const stopped = defaultTimer();
  expect(statusOf(() => pauseTimer(stopped, T0))).toBe(409);
  expect(statusOf(() => resumeTimer(running(), T0))).toBe(409);
  expect(statusOf(() => stopTimer(stopped))).toBe(409);
  expect(statusOf(() => dismissTimer(running()))).toBe(409);
});

test("length is clamped to 1 minute .. 24 hours and rounded", () => {
  expect(startTimer(defaultTimer(), T0, 1).lengthMs).toBe(M);
  expect(startTimer(defaultTimer(), T0, 10 * 24 * H).lengthMs).toBe(24 * H);
  expect(startTimer(defaultTimer(), T0, 5 * M + 0.4).lengthMs).toBe(5 * M);
});

test("a non-finite length is refused (400)", () => {
  expect(statusOf(() => startTimer(defaultTimer(), T0, NaN))).toBe(400);
  expect(statusOf(() => startTimer(defaultTimer(), T0, Infinity))).toBe(400);
});

test("a label over 40 characters is refused (400); 40 is accepted", () => {
  expect(statusOf(() => startTimer(defaultTimer(), T0, M, "x".repeat(41)))).toBe(400);
  expect(startTimer(defaultTimer(), T0, M, "x".repeat(40)).label).toHaveLength(40);
  expect(statusOf(() => startTimer(defaultTimer(), T0, M, " ".repeat(5) + "x".repeat(40)))).toBeUndefined();
});

test("add needs a positive finite ms (400)", () => {
  for (const ms of [0, -1, NaN, Infinity]) {
    expect(statusOf(() => addTimer(running(), T0, ms))).toBe(400);
  }
});

test("state shows only the fields of its status", () => {
  const r = toTimerState(running(), T0);
  expect([r.endsAt === null, r.remainingMs, r.doneAt]).toEqual([false, null, null]);
  const p = toTimerState(pauseTimer(running(), at(M)), at(M));
  expect([p.endsAt, p.remainingMs, p.doneAt]).toEqual([null, 9 * M, null]);
});
