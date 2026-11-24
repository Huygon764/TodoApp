import { test, expect } from "bun:test";
import {
  formatClock,
  formatHm,
  serverOffsetMs,
  stayOutMs,
  stayReachedZero,
  stayRemainingMs,
  stayStayedMs,
  weekColumns,
  weekReached,
} from "./stayClock.js";
import type { StayDayView } from "../types/stay.js";

const H = 3_600_000;
const T0 = Date.parse("2026-11-24T08:00:00.000Z");

function day(over: Partial<StayDayView> = {}): StayDayView {
  return {
    date: "2026-11-24",
    level: 8,
    status: "idle",
    stayedMs: 0,
    runningSince: null,
    pausedAs: null,
    pausedSince: null,
    escapes: 0,
    outMs: 0,
    doneAt: null,
    closed: false,
    ...over,
  };
}

test("server offset is server time minus local time", () => {
  expect(serverOffsetMs("2026-11-24T08:00:05.000Z", T0)).toBe(5000);
  expect(serverOffsetMs("garbage", T0)).toBe(0);
});

test("idle day has the full level remaining", () => {
  expect(stayRemainingMs(day(), T0)).toBe(8 * H);
});

test("running adds the open stretch to stayed time", () => {
  const d = day({ status: "running", stayedMs: H, runningSince: new Date(T0).toISOString() });
  expect(stayStayedMs(d, T0 + 30 * 60_000)).toBe(1.5 * H);
  expect(stayRemainingMs(d, T0 + 30 * 60_000)).toBe(6.5 * H);
});

test("paused does not advance stayed time", () => {
  const d = day({
    status: "paused",
    stayedMs: 2 * H,
    pausedAs: "escape",
    pausedSince: new Date(T0).toISOString(),
  });
  expect(stayStayedMs(d, T0 + 5 * H)).toBe(2 * H);
});

test("out time counts an open Out pause only", () => {
  const out = day({
    status: "paused",
    pausedAs: "out",
    pausedSince: new Date(T0).toISOString(),
    outMs: 10 * 60_000,
  });
  expect(stayOutMs(out, T0 + 20 * 60_000)).toBe(30 * 60_000);
  const esc = day({ ...out, pausedAs: "escape" });
  expect(stayOutMs(esc, T0 + 20 * 60_000)).toBe(10 * 60_000);
});

test("zero is reached only while running", () => {
  const running = day({ status: "running", stayedMs: 7 * H, runningSince: new Date(T0).toISOString() });
  expect(stayReachedZero(running, T0 + H - 1)).toBe(false);
  expect(stayReachedZero(running, T0 + H)).toBe(true);
  expect(stayReachedZero(day({ status: "done" }), T0)).toBe(false);
});

test("a skewed local clock is fixed by the offset", () => {
  const server = Date.parse("2026-11-24T08:00:00.000Z");
  const local = server - 60_000; // local clock one minute behind
  const offset = serverOffsetMs(new Date(server).toISOString(), local);
  const d = day({ status: "running", runningSince: new Date(server).toISOString() });
  expect(stayStayedMs(d, local + offset)).toBe(0);
  expect(stayStayedMs(d, local)).toBe(0); // clamped, never negative
});

test("clock rounds up so zero shows only at zero", () => {
  expect(formatClock(8 * H)).toBe("8:00:00");
  expect(formatClock(1)).toBe("0:00:01");
  expect(formatClock(0)).toBe("0:00:00");
  expect(formatClock(25 * 60_000, false)).toBe("25:00");
  expect(formatClock(90 * 60_000 + 5000, false)).toBe("90:05");
});

test("hm floors to whole minutes", () => {
  expect(formatHm(3 * H + 12 * 60_000 + 59_000)).toBe("3h 12m");
  expect(formatHm(40 * 60_000)).toBe("40m");
  expect(formatHm(H)).toBe("1h 00m");
});

test("week has seven columns, today live, future empty", () => {
  const week = [
    day({ date: "2026-11-23", status: "done", level: 8, stayedMs: 8 * H, escapes: 2 }),
    day({ date: "2026-11-24", status: "running", level: 8, stayedMs: 0, runningSince: new Date(T0).toISOString() }),
  ];
  const cols = weekColumns(week, T0 + 4 * H);
  expect(cols).toHaveLength(7);
  expect(cols[0]).toMatchObject({ share: 1, escapes: 2, reached: true, isToday: false });
  expect(cols[1]).toMatchObject({ share: 0.5, reached: false, isToday: true });
  expect(cols[2]).toMatchObject({ future: true, share: 0 });
  expect(weekReached(cols)).toBe(1);
});

test("a closed past day shows its stayed share, not reached", () => {
  const week = [
    day({ date: "2026-11-23", status: "running", closed: true, level: 8, stayedMs: 4 * H }),
    day({ date: "2026-11-24" }),
  ];
  const cols = weekColumns(week, T0);
  expect(cols[0]).toMatchObject({ share: 0.5, reached: false });
});
