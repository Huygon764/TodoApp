import { test, expect } from "bun:test";
import {
  idleDay,
  startDay,
  pauseDay,
  resumeDay,
  changeLevel,
  settleDay,
  toView,
  stayedAt,
  levelMs,
} from "./stayLogic.js";
import { zonedMidnightMs, mondayOf, addDays } from "../utils/zonedTime.js";

const TZ = "Asia/Ho_Chi_Minh"; // UTC+7, no DST
const H = 3_600_000;
const M = 60_000;
const DAY = "2026-11-24";
// 2026-11-24 08:00 local = 01:00Z
const T0 = new Date("2026-11-24T01:00:00Z");
const at = (ms: number) => new Date(T0.getTime() + ms);

test("zonedMidnightMs gives local midnight, not UTC midnight", () => {
  expect(new Date(zonedMidnightMs("2026-11-25", TZ)).toISOString()).toBe(
    "2026-11-24T17:00:00.000Z",
  );
});

test("zonedMidnightMs follows DST in New York", () => {
  // Spring forward 2026-03-08: midnight on the 8th is EST, on the 9th EDT.
  expect(new Date(zonedMidnightMs("2026-03-08", "America/New_York")).toISOString()).toBe(
    "2026-03-08T05:00:00.000Z",
  );
  expect(new Date(zonedMidnightMs("2026-03-09", "America/New_York")).toISOString()).toBe(
    "2026-03-09T04:00:00.000Z",
  );
  // Fall back 2026-11-01.
  expect(new Date(zonedMidnightMs("2026-11-01", "America/New_York")).toISOString()).toBe(
    "2026-11-01T04:00:00.000Z",
  );
  expect(new Date(zonedMidnightMs("2026-11-02", "America/New_York")).toISOString()).toBe(
    "2026-11-02T05:00:00.000Z",
  );
});

test("zonedMidnightMs when DST skips 00:00 (Santiago) is the first instant of the day", () => {
  // 2026-09-06: clocks go from 23:59 Sat straight to 01:00 Sun (04:00Z).
  expect(new Date(zonedMidnightMs("2026-09-06", "America/Santiago")).toISOString()).toBe(
    "2026-09-06T04:00:00.000Z",
  );
  expect(new Date(zonedMidnightMs("2026-09-05", "America/Santiago")).toISOString()).toBe(
    "2026-09-05T04:00:00.000Z",
  );
});

test("level changes before Start are recorded; a no-op change is not", () => {
  let d = changeLevel(idleDay(DAY), 12, T0);
  expect(d.levelChanges).toEqual([{ at: T0, from: 8, to: 12 }]);
  d = changeLevel(d, 12, at(M));
  expect(d.levelChanges.length).toBe(1);
  d = changeLevel(d, 6, at(2 * M));
  expect(d.levelChanges.map((c) => [c.from, c.to])).toEqual([[8, 12], [12, 6]]);
});

test("mondayOf and addDays are calendar arithmetic", () => {
  expect(mondayOf("2026-11-24")).toBe("2026-11-23"); // Tuesday
  expect(mondayOf("2026-11-29")).toBe("2026-11-23"); // Sunday
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
});

test("countdown from timestamps across pause and resume", () => {
  let d = startDay(idleDay(DAY), T0);
  expect(stayedAt(d, at(30 * M))).toBe(30 * M);
  d = pauseDay(d, "out", at(30 * M));
  expect(d.stayedMs).toBe(30 * M);
  expect(stayedAt(d, at(90 * M))).toBe(30 * M); // paused time does not count
  d = resumeDay(d, at(90 * M));
  expect(stayedAt(d, at(120 * M))).toBe(60 * M);
});

test("a running day reaches zero at the exact instant, even if read later", () => {
  let d = startDay(idleDay(DAY), T0);
  d = pauseDay(d, "escape", at(2 * H));
  d = resumeDay(d, at(3 * H)); // 2h stayed, 6h left -> zero at +9h
  const settled = settleDay(d, at(20 * H), TZ, DAY);
  expect(settled.status).toBe("done");
  expect(settled.stayedMs).toBe(levelMs(8));
  expect(settled.doneAt!.toISOString()).toBe(at(9 * H).toISOString());
  expect(settleDay(d, at(8 * H), TZ, DAY)).toBe(d); // not yet: unchanged
});

test("escape counts, out adds its duration, neither mixes", () => {
  let d = startDay(idleDay(DAY), T0);
  d = pauseDay(d, "escape", at(1 * H));
  expect(d.escapes).toBe(1);
  d = resumeDay(d, at(2 * H));
  expect(d.outMs).toBe(0);
  d = pauseDay(d, "out", at(3 * H));
  expect(d.escapes).toBe(1);
  expect(d.outMs).toBe(0); // open Out pause is not in outMs yet
  d = resumeDay(d, at(3 * H + 40 * M));
  expect(d.outMs).toBe(40 * M);
  expect(d.stayedMs).toBe(2 * H);
});

test("state errors are 409", () => {
  const idle = idleDay(DAY);
  const running = startDay(idle, T0);
  expect(() => startDay(running, T0)).toThrow(/start/);
  expect(() => pauseDay(idle, "out", T0)).toThrow();
  expect(() => resumeDay(running, T0)).toThrow();
  try {
    pauseDay(idle, "out", T0);
  } catch (e) {
    expect((e as { statusCode: number }).statusCode).toBe(409);
  }
});

test("level: free before Start, only down after, locked when done", () => {
  let d = changeLevel(idleDay(DAY), 12, T0);
  expect(d.level).toBe(12);
  d = changeLevel(d, 6, T0);
  expect(d.level).toBe(6);
  d = startDay(d, T0);
  expect(() => changeLevel(d, 8, T0)).toThrow(); // up refused
  expect(() => changeLevel(d, 6, T0)).toThrow(); // equal refused
  const done = settleDay(d, at(7 * H), TZ, DAY);
  expect(done.status).toBe("done");
  expect(() => changeLevel(done, 6, T0)).toThrow();
});

test("level down to a lower level than stayed ends the day as done", () => {
  let d = startDay(idleDay(DAY), T0); // level 8
  d = pauseDay(d, "out", at(7 * H));
  const done = changeLevel(d, 6, at(7 * H + 30 * M));
  expect(done.status).toBe("done");
  expect(done.stayedMs).toBe(7 * H);
  expect(done.doneAt!.toISOString()).toBe(at(7 * H + 30 * M).toISOString());
  expect(done.outMs).toBe(30 * M); // open Out pause closed into outMs
  expect(done.pausedAs).toBeNull();
  expect(done.levelChanges).toEqual([
    { at: at(7 * H + 30 * M), from: 8, to: 6 },
  ]);
});

test("level down while still short of the new level keeps counting", () => {
  let d = startDay(idleDay(DAY), T0);
  d = changeLevel(d, 6, at(2 * H));
  expect(d.status).toBe("running");
  expect(settleDay(d, at(6 * H), TZ, DAY).status).toBe("done");
});

test("midnight close in the user's timezone: not reached", () => {
  // Start 20:00 local on 24th (13:00Z); midnight is 17:00Z = 4h later.
  const start = new Date("2026-11-24T13:00:00Z");
  const d = startDay(idleDay(DAY), start);
  const settled = settleDay(d, new Date("2026-11-25T05:00:00Z"), TZ, "2026-11-25");
  expect(settled.status).toBe("idle");
  expect(settled.stayedMs).toBe(4 * H); // up to local midnight only
  expect(settled.runningSince).toBeNull();
  expect(toView(settled, "2026-11-25").closed).toBe(true);
  expect(toView(settled, DAY).closed).toBe(false);
});

test("midnight close: level reached before midnight becomes done", () => {
  const d = changeLevel(idleDay(DAY), 6, T0);
  const start = startDay(d, new Date("2026-11-24T10:00:00Z")); // 17:00 local
  // reaches 6h at 16:00Z next... 10:00Z + 6h = 16:00Z = 23:00 local, before midnight
  const settled = settleDay(start, new Date("2026-11-26T00:00:00Z"), TZ, "2026-11-26");
  expect(settled.status).toBe("done");
  expect(settled.doneAt!.toISOString()).toBe("2026-11-24T16:00:00.000Z");
});

test("midnight close: Out pause counts up to midnight, escape does not", () => {
  const start = new Date("2026-11-24T10:00:00Z");
  let d = startDay(idleDay(DAY), start);
  d = pauseDay(d, "out", new Date("2026-11-24T12:00:00Z"));
  const out = settleDay(d, new Date("2026-11-25T03:00:00Z"), TZ, "2026-11-25");
  expect(out.outMs).toBe(5 * H); // 12:00Z -> 17:00Z
  expect(out.stayedMs).toBe(2 * H);
  expect(out.pausedAs).toBeNull();
  expect(out.pausedSince).toBeNull();

  let e = startDay(idleDay(DAY), start);
  e = pauseDay(e, "escape", new Date("2026-11-24T12:00:00Z"));
  const esc = settleDay(e, new Date("2026-11-25T03:00:00Z"), TZ, "2026-11-25");
  expect(esc.outMs).toBe(0);
  expect(esc.escapes).toBe(1);
});

test("a started-then-closed day with no stay is still closed; an idle past day is not", () => {
  const d = startDay(idleDay(DAY), new Date("2026-11-24T16:59:00Z"));
  const paused = pauseDay(d, "escape", new Date("2026-11-24T16:59:00Z"));
  const closed = settleDay(paused, new Date("2026-11-25T03:00:00Z"), TZ, "2026-11-25");
  expect(toView(closed, "2026-11-25").closed).toBe(true);
  expect(toView(idleDay(DAY), "2026-11-25").closed).toBe(false);
});

test("view serialises times as ISO strings and null", () => {
  const d = startDay(idleDay(DAY), T0);
  const v = toView(d, DAY);
  expect(v.runningSince).toBe("2026-11-24T01:00:00.000Z");
  expect(v.pausedSince).toBeNull();
  expect(v.doneAt).toBeNull();
});
