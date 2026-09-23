import { expect, test } from "bun:test";
import {
  pickWeeklyRandomWeekday,
  shouldIncludeWeeklyItem,
} from "./weeklyRandom.js";

const USER = "507f1f77bcf86cd799439011";
const WEEK_A = "2026-W12";
const WEEK_B = "2026-W13";

test("pickWeeklyRandomWeekday matches the shared frontend golden vector", () => {
  expect(pickWeeklyRandomWeekday(USER, "Gym", WEEK_A)).toBe(7);
});

test("pickWeeklyRandomWeekday is stable for the same week", () => {
  const a = pickWeeklyRandomWeekday(USER, "Gym", WEEK_A);
  const b = pickWeeklyRandomWeekday(USER, "Gym", WEEK_A);
  expect(a).toBe(b);
  expect(a).toBeGreaterThanOrEqual(1);
  expect(a).toBeLessThanOrEqual(7);
});

test("pickWeeklyRandomWeekday trims the title", () => {
  expect(pickWeeklyRandomWeekday(USER, "  Gym  ", WEEK_A)).toBe(
    pickWeeklyRandomWeekday(USER, "Gym", WEEK_A),
  );
});

test("pickWeeklyRandomWeekday stays in 1-7 for another week", () => {
  const day = pickWeeklyRandomWeekday(USER, "Gym", WEEK_B);
  expect(day).toBeGreaterThanOrEqual(1);
  expect(day).toBeLessThanOrEqual(7);
});

test("shouldIncludeWeeklyItem includes a random item only on its picked weekday", () => {
  const item = { title: "Gym", weeklyRandom: true };
  const picked = pickWeeklyRandomWeekday(USER, "Gym", WEEK_A);
  const other = picked === 7 ? 1 : picked + 1;
  expect(
    shouldIncludeWeeklyItem(item, picked, false, USER, WEEK_A),
  ).toBe(true);
  expect(
    shouldIncludeWeeklyItem(item, other, other === 1, USER, WEEK_A),
  ).toBe(false);
});

test("shouldIncludeWeeklyItem ignores daysOfWeek when weeklyRandom is set", () => {
  const item = { title: "Gym", weeklyRandom: true, daysOfWeek: [1] };
  const picked = pickWeeklyRandomWeekday(USER, "Gym", WEEK_A);
  expect(
    shouldIncludeWeeklyItem(item, picked, false, USER, WEEK_A),
  ).toBe(true);
  if (picked !== 1) {
    expect(shouldIncludeWeeklyItem(item, 1, true, USER, WEEK_A)).toBe(false);
  }
});

test("shouldIncludeWeeklyItem keeps fixed weekdays when not random", () => {
  const item = { title: "Gym", daysOfWeek: [2, 5] };
  expect(shouldIncludeWeeklyItem(item, 2, false, USER, WEEK_A)).toBe(true);
  expect(shouldIncludeWeeklyItem(item, 5, false, USER, WEEK_A)).toBe(true);
  expect(shouldIncludeWeeklyItem(item, 1, true, USER, WEEK_A)).toBe(false);
});

test("shouldIncludeWeeklyItem treats missing schedule as Monday-only", () => {
  const item = { title: "Gym" };
  expect(shouldIncludeWeeklyItem(item, 1, true, USER, WEEK_A)).toBe(true);
  expect(shouldIncludeWeeklyItem(item, 3, false, USER, WEEK_A)).toBe(false);
});
