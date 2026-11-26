import { test, expect } from "bun:test";
import {
  customLengthMs,
  splitLength,
  timerPresetIndex,
  timerProgress,
  timerReachedZero,
  timerRemainingMs,
} from "./timerClock.js";
import type { TimerState } from "../types/stay.js";

const MIN = 60_000;
const T0 = Date.parse("2026-11-26T08:00:00.000Z");

function state(over: Partial<TimerState> = {}): TimerState {
  return {
    serverNow: new Date(T0).toISOString(),
    lengthMs: 10 * MIN,
    label: "",
    status: "running",
    endsAt: new Date(T0 + 10 * MIN).toISOString(),
    remainingMs: null,
    doneAt: null,
    ...over,
  };
}

test("stopped shows the full length and no progress", () => {
  const s = state({ status: "stopped", endsAt: null });
  expect(timerRemainingMs(s, T0)).toBe(10 * MIN);
  expect(timerProgress(s, T0)).toBe(0);
  expect(timerReachedZero(s, T0 + 99 * MIN)).toBe(false);
});

test("running counts down to endsAt", () => {
  const s = state();
  expect(timerRemainingMs(s, T0)).toBe(10 * MIN);
  expect(timerRemainingMs(s, T0 + 4 * MIN)).toBe(6 * MIN);
  expect(timerProgress(s, T0 + 5 * MIN)).toBe(0.5);
});

test("paused is frozen at remainingMs whatever the clock says", () => {
  const s = state({ status: "paused", endsAt: null, remainingMs: 3 * MIN });
  expect(timerRemainingMs(s, T0)).toBe(3 * MIN);
  expect(timerRemainingMs(s, T0 + 99 * MIN)).toBe(3 * MIN);
  expect(timerReachedZero(s, T0 + 99 * MIN)).toBe(false);
  expect(timerProgress(s, T0)).toBeCloseTo(0.7);
});

test("zero is detected only for a running timer, at endsAt", () => {
  const s = state();
  expect(timerReachedZero(s, T0 + 10 * MIN - 1)).toBe(false);
  expect(timerReachedZero(s, T0 + 10 * MIN)).toBe(true);
  expect(timerRemainingMs(s, T0 + 20 * MIN)).toBe(0);
  const done = state({ status: "done", endsAt: null, doneAt: s.endsAt });
  expect(timerReachedZero(done, T0 + 20 * MIN)).toBe(false);
  expect(timerRemainingMs(done, T0)).toBe(0);
  expect(timerProgress(done, T0)).toBe(1);
});

test("time added past the length keeps progress between 0 and 1", () => {
  const s = state({ status: "paused", endsAt: null, remainingMs: 15 * MIN });
  expect(timerProgress(s, T0)).toBe(0);
});

test("presets map to their index, any other length to Custom", () => {
  expect(timerPresetIndex(5 * MIN)).toBe(0);
  expect(timerPresetIndex(10 * MIN)).toBe(1);
  expect(timerPresetIndex(60 * MIN)).toBe(4);
  expect(timerPresetIndex(20 * MIN)).toBe(5);
  expect(timerPresetIndex(61 * MIN)).toBe(5);
});

test("custom hours and minutes clamp to 1 minute..24 hours", () => {
  expect(customLengthMs(0, 20)).toBe(20 * MIN);
  expect(customLengthMs(1, 30)).toBe(90 * MIN);
  expect(customLengthMs(0, 0)).toBe(MIN);
  expect(customLengthMs(0, -5)).toBe(MIN);
  expect(customLengthMs(30, 0)).toBe(24 * 60 * MIN);
  expect(customLengthMs(24, 30)).toBe(24 * 60 * MIN);
  expect(customLengthMs(NaN, 15)).toBe(15 * MIN);
  expect(customLengthMs(0, 90)).toBe(90 * MIN);
});

test("a length splits into hours and minutes", () => {
  expect(splitLength(90 * MIN)).toEqual({ hours: 1, minutes: 30 });
  expect(splitLength(20 * MIN)).toEqual({ hours: 0, minutes: 20 });
  expect(splitLength(24 * 60 * MIN)).toEqual({ hours: 24, minutes: 0 });
});
