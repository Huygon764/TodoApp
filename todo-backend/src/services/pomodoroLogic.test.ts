import { test, expect } from "bun:test";
import {
  defaultPomodoro,
  startPomodoro,
  pausePomodoro,
  resumePomodoro,
  stopPomodoro,
  advancePomodoro,
  pruneRounds,
  setPomodoroSettings,
  toPomodoroState,
} from "./pomodoroLogic.js";

const TZ = "Asia/Ho_Chi_Minh"; // UTC+7
const M = 60_000;
const T0 = new Date("2026-11-24T01:00:00Z"); // 08:00 local
const at = (ms: number) => new Date(T0.getTime() + ms);

test("defaults are 25/5, idle", () => {
  const p = defaultPomodoro();
  expect([p.workMin, p.restMin, p.phase]).toEqual([25, 5, "idle"]);
});

test("a phase does not move before its length is used", () => {
  const p = startPomodoro(defaultPomodoro(), T0);
  expect(advancePomodoro(p, at(24 * M), TZ)).toBe(p);
});

test("work ends at the exact instant and rest starts there", () => {
  const p = startPomodoro(defaultPomodoro(), T0);
  const a = advancePomodoro(p, at(27 * M), TZ);
  expect(a.phase).toBe("rest");
  expect(a.phaseStartedAt!.toISOString()).toBe(at(25 * M).toISOString());
  expect(a.pausedMs).toBe(0);
  expect(a.roundsByDate["2026-11-24"]).toBe(1);
});

test("phases and rounds advance across a closed period", () => {
  const p = startPomodoro(defaultPomodoro(), T0);
  // 25+5 cycles of 30 min; after 95 min: 3 rounds done, 5 min into work #4.
  const a = advancePomodoro(p, at(95 * M), TZ);
  expect(a.phase).toBe("work");
  expect(a.roundsByDate["2026-11-24"]).toBe(3);
  expect(a.phaseStartedAt!.toISOString()).toBe(at(90 * M).toISOString());
});

test("pause time is excluded and extends the phase", () => {
  let p = startPomodoro(defaultPomodoro(), T0);
  p = pausePomodoro(p, at(10 * M));
  expect(advancePomodoro(p, at(500 * M), TZ)).toBe(p); // paused: never advances
  p = resumePomodoro(p, at(40 * M)); // 30 min paused
  expect(p.pausedMs).toBe(30 * M);
  expect(advancePomodoro(p, at(54 * M), TZ).phase).toBe("work"); // 54-30 = 24
  const a = advancePomodoro(p, at(55 * M), TZ);
  expect(a.phase).toBe("rest");
  expect(a.phaseStartedAt!.toISOString()).toBe(at(55 * M).toISOString());
});

test("a round ending after local midnight counts for the next date", () => {
  // Start 23:50 local on the 24th (16:50Z); work ends 00:15 local on the 25th.
  const start = new Date("2026-11-24T16:50:00Z");
  const p = startPomodoro(defaultPomodoro(), start);
  const a = advancePomodoro(p, new Date("2026-11-24T17:30:00Z"), TZ);
  expect(a.roundsByDate["2026-11-25"]).toBe(1);
  expect(a.roundsByDate["2026-11-24"]).toBeUndefined();
  const s = toPomodoroState(a, new Date("2026-11-24T17:30:00Z"), TZ);
  expect(s.roundsToday).toBe(1); // 00:30 local is the 25th
});

test("stop clears timestamps and a partial focus is not a round", () => {
  let p = startPomodoro(defaultPomodoro(), T0);
  p = pausePomodoro(p, at(5 * M));
  p = stopPomodoro(p);
  expect(p.phase).toBe("idle");
  expect(p.phaseStartedAt).toBeNull();
  expect(p.pausedAt).toBeNull();
  expect(p.pausedMs).toBe(0);
  expect(p.roundsByDate).toEqual({});
  expect(stopPomodoro(defaultPomodoro()).phase).toBe("idle"); // any state
});

test("transition errors are 409", () => {
  const idle = defaultPomodoro();
  const running = startPomodoro(idle, T0);
  expect(() => startPomodoro(running, T0)).toThrow();
  expect(() => pausePomodoro(idle, T0)).toThrow();
  expect(() => resumePomodoro(running, T0)).toThrow();
  const paused = pausePomodoro(running, T0);
  expect(() => pausePomodoro(paused, T0)).toThrow();
  try {
    resumePomodoro(idle, T0);
  } catch (e) {
    expect((e as { statusCode: number }).statusCode).toBe(409);
  }
});

test("preset change is refused while running or paused, allowed when idle", () => {
  const idle = defaultPomodoro();
  expect(setPomodoroSettings(idle, 50, 10)).toMatchObject({ workMin: 50, restMin: 10 });
  const running = startPomodoro(idle, T0);
  expect(() => setPomodoroSettings(running, 50, 10)).toThrow();
  expect(() => setPomodoroSettings(pausePomodoro(running, T0), 50, 10)).toThrow();
});

test("rounds are pruned to the current week (Monday, user timezone)", () => {
  const p = {
    ...defaultPomodoro(),
    roundsByDate: { "2026-11-22": 4, "2026-11-23": 2, "2026-11-24": 1 },
  };
  const pruned = pruneRounds(p, at(0), TZ); // Tuesday 24th, Monday is the 23rd
  expect(pruned.roundsByDate).toEqual({ "2026-11-23": 2, "2026-11-24": 1 });
});

test("state exposes ISO strings and serverNow", () => {
  const p = startPomodoro(defaultPomodoro(), T0);
  const s = toPomodoroState(p, at(M), TZ);
  expect(s.phaseStartedAt).toBe("2026-11-24T01:00:00.000Z");
  expect(s.serverNow).toBe("2026-11-24T01:01:00.000Z");
  expect(s.pausedAt).toBeNull();
});
