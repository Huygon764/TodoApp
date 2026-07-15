import { test, expect } from "bun:test";
import {
  isoWeekday,
  addDays,
  isScheduled,
  computeStreak,
  computeBestStreak,
  computeRate,
  windowStates,
} from "./habitSchedule.js";

const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];

test("isoWeekday maps Monday to 1 and Sunday to 7", () => {
  expect(isoWeekday("2026-07-13")).toBe(1); // Monday
  expect(isoWeekday("2026-07-19")).toBe(7); // Sunday
});

test("addDays crosses month boundaries", () => {
  expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
  expect(addDays("2026-08-01", -1)).toBe("2026-07-31");
});

test("isScheduled respects daysOfWeek", () => {
  expect(isScheduled("2026-07-13", [1, 3, 5])).toBe(true); // Monday
  expect(isScheduled("2026-07-14", [1, 3, 5])).toBe(false); // Tuesday
});

// --- streaks on an every-day habit ---

test("streak counts consecutive logged days ending today when today is ticked", () => {
  const logDates = new Set(["2026-07-13", "2026-07-14", "2026-07-15"]);
  expect(
    computeStreak({ today: "2026-07-15", daysOfWeek: EVERY_DAY, logDates, createdDate: "2026-07-01" }),
  ).toBe(3);
});

test("an un-ticked today does not break the streak", () => {
  const logDates = new Set(["2026-07-13", "2026-07-14"]); // today (15th) not logged
  expect(
    computeStreak({ today: "2026-07-15", daysOfWeek: EVERY_DAY, logDates, createdDate: "2026-07-01" }),
  ).toBe(2);
});

test("a missed scheduled yesterday breaks the streak", () => {
  const logDates = new Set(["2026-07-13", "2026-07-15"]); // 14th missed
  expect(
    computeStreak({ today: "2026-07-15", daysOfWeek: EVERY_DAY, logDates, createdDate: "2026-07-01" }),
  ).toBe(1);
});

// --- streaks skip unscheduled days ---

test("unscheduled days neither extend nor break a streak", () => {
  // Habit only Mon/Wed/Fri. Logged Mon 13, Wed 15. Today Fri 17 ticked.
  const daysOfWeek = [1, 3, 5];
  const logDates = new Set(["2026-07-13", "2026-07-15", "2026-07-17"]);
  expect(
    computeStreak({ today: "2026-07-17", daysOfWeek, logDates, createdDate: "2026-07-01" }),
  ).toBe(3);
});

test("streak does not count days before createdDate as misses", () => {
  // Created Wed 15th; today Fri 17th, logged 15,16,17. Days before 15 ignored.
  const logDates = new Set(["2026-07-15", "2026-07-16", "2026-07-17"]);
  expect(
    computeStreak({ today: "2026-07-17", daysOfWeek: EVERY_DAY, logDates, createdDate: "2026-07-15" }),
  ).toBe(3);
});

// --- best streak ---

test("best streak finds the longest historical run", () => {
  // Runs: 11-12 (2), gap 13, 14-15-16 (3), today 17 unticked.
  const logDates = new Set(["2026-07-11", "2026-07-12", "2026-07-14", "2026-07-15", "2026-07-16"]);
  expect(
    computeBestStreak({ today: "2026-07-17", daysOfWeek: EVERY_DAY, logDates, createdDate: "2026-07-10" }),
  ).toBe(3);
});

test("best streak is never below the current streak", () => {
  const logDates = new Set(["2026-07-14", "2026-07-15"]);
  const args = { today: "2026-07-15", daysOfWeek: EVERY_DAY, logDates, createdDate: "2026-07-14" };
  expect(computeBestStreak(args)).toBeGreaterThanOrEqual(computeStreak(args));
});

// --- rate ---

test("rate divides logs by scheduled days in the window", () => {
  // Mon/Wed/Fri habit, window 13..19: scheduled = Mon13, Wed15, Fri17 = 3. Logged 2.
  const daysOfWeek = [1, 3, 5];
  const logDates = new Set(["2026-07-13", "2026-07-17"]);
  const r = computeRate("2026-07-13", "2026-07-19", daysOfWeek, logDates, "2026-07-01");
  expect(r).toEqual({ scheduled: 3, done: 2, rate: 2 / 3 });
});

test("rate ignores days before createdDate", () => {
  // Created 15th. Window 13..19 every day: scheduled = 15,16,17,18,19 = 5.
  const logDates = new Set(["2026-07-15", "2026-07-16"]);
  const r = computeRate("2026-07-13", "2026-07-19", EVERY_DAY, logDates, "2026-07-15");
  expect(r.scheduled).toBe(5);
  expect(r.done).toBe(2);
});

// --- window states ---

test("windowStates marks done, missed and off correctly", () => {
  // Mon/Wed/Fri habit. 5-day window ending Fri 17th: 13,14,15,16,17.
  const daysOfWeek = [1, 3, 5];
  const logDates = new Set(["2026-07-13"]); // Mon done, Wed missed, Fri today not logged
  const states = windowStates("2026-07-17", 5, daysOfWeek, logDates, "2026-07-01");
  expect(states).toEqual([
    { date: "2026-07-13", state: "done" }, // Mon logged
    { date: "2026-07-14", state: "off" }, // Tue not scheduled
    { date: "2026-07-15", state: "missed" }, // Wed scheduled, not logged
    { date: "2026-07-16", state: "off" }, // Thu not scheduled
    { date: "2026-07-17", state: "missed" }, // Fri today, not logged
  ]);
});

test("windowStates shows off for days before createdDate", () => {
  const states = windowStates("2026-07-17", 3, EVERY_DAY, new Set(), "2026-07-16");
  expect(states[0]).toEqual({ date: "2026-07-15", state: "off" });
  expect(states[1]).toEqual({ date: "2026-07-16", state: "missed" });
});
