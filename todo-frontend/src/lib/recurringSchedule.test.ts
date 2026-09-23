import { expect, test } from "bun:test";
import {
  isLegacyWeekItem,
  isWeekItemInContext,
  isWeekItemVisible,
  pickWeeklyRandomWeekday,
} from "./recurringSchedule.js";

const USER = "507f1f77bcf86cd799439011";
const WEEK_A = "2026-W12";

test("pickWeeklyRandomWeekday matches the backend golden vector", () => {
  expect(pickWeeklyRandomWeekday(USER, "Gym", WEEK_A)).toBe(7);
});

test("pickWeeklyRandomWeekday trims the title", () => {
  expect(pickWeeklyRandomWeekday(USER, "  Gym  ", WEEK_A)).toBe(
    pickWeeklyRandomWeekday(USER, "Gym", WEEK_A),
  );
});

test("isWeekItemVisible always shows weeklyRandom items in the modal", () => {
  expect(
    isWeekItemVisible({ title: "Gym", order: 0, weeklyRandom: true }, 3),
  ).toBe(true);
});

test("isWeekItemInContext in random mode hides fixed-day items", () => {
  expect(
    isWeekItemInContext(
      { title: "Check mail", order: 0, daysOfWeek: [1] },
      1,
      true,
    ),
  ).toBe(false);
  expect(
    isWeekItemInContext(
      { title: "Gym", order: 0, weeklyRandom: true },
      1,
      true,
    ),
  ).toBe(true);
});

test("isLegacyWeekItem is false for weeklyRandom items", () => {
  expect(isLegacyWeekItem({ title: "Gym", order: 0, weeklyRandom: true })).toBe(
    false,
  );
});
