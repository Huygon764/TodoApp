import { test, expect } from "bun:test";
import {
  clamp,
  pomodoroElapsedMs,
  pomodoroPhaseEnded,
  pomodoroProgress,
  pomodoroRemainingMs,
  presetIndex,
} from "./pomodoroClock.js";
import type { PomodoroState } from "../types/stay.js";

const MIN = 60_000;
const T0 = Date.parse("2026-11-24T08:00:00.000Z");

function state(over: Partial<PomodoroState> = {}): PomodoroState {
  return {
    serverNow: new Date(T0).toISOString(),
    workMin: 25,
    restMin: 5,
    phase: "work",
    phaseStartedAt: new Date(T0).toISOString(),
    pausedAt: null,
    pausedMs: 0,
    roundsToday: 0,
    ...over,
  };
}

test("presets map to 0 and 1, anything else to Custom", () => {
  expect(presetIndex(25, 5)).toBe(0);
  expect(presetIndex(50, 10)).toBe(1);
  expect(presetIndex(40, 8)).toBe(2);
  expect(presetIndex(25, 10)).toBe(2);
});

test("clamp keeps focus 1-120 and rest 1-60", () => {
  expect(clamp(0, 1, 120, 25)).toBe(1);
  expect(clamp(500, 1, 120, 25)).toBe(120);
  expect(clamp(61, 1, 60, 5)).toBe(60);
  expect(clamp(NaN, 1, 60, 5)).toBe(5);
  expect(clamp(7.6, 1, 60, 5)).toBe(8);
});

test("idle shows the full focus length", () => {
  const s = state({ phase: "idle", phaseStartedAt: null });
  expect(pomodoroRemainingMs(s, T0)).toBe(25 * MIN);
  expect(pomodoroProgress(s, T0)).toBe(0);
});

test("running elapsed is now minus start minus paused time", () => {
  const s = state({ pausedMs: 2 * MIN });
  expect(pomodoroElapsedMs(s, T0 + 10 * MIN)).toBe(8 * MIN);
  expect(pomodoroRemainingMs(s, T0 + 10 * MIN)).toBe(17 * MIN);
});

test("paused freezes at pausedAt", () => {
  const s = state({ pausedAt: new Date(T0 + 10 * MIN).toISOString() });
  expect(pomodoroElapsedMs(s, T0 + 99 * MIN)).toBe(10 * MIN);
  expect(pomodoroPhaseEnded(s, T0 + 99 * MIN)).toBe(false);
});

test("rest phase uses the rest length", () => {
  const s = state({ phase: "rest" });
  expect(pomodoroRemainingMs(s, T0 + 2 * MIN)).toBe(3 * MIN);
  expect(pomodoroProgress(s, T0 + 2.5 * MIN)).toBe(0.5);
});

test("phase ends at zero and progress caps at 1", () => {
  const s = state();
  expect(pomodoroPhaseEnded(s, T0 + 25 * MIN - 1)).toBe(false);
  expect(pomodoroPhaseEnded(s, T0 + 25 * MIN)).toBe(true);
  expect(pomodoroProgress(s, T0 + 40 * MIN)).toBe(1);
});
