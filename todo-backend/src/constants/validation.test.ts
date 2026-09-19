import { test, expect } from "bun:test";
import { LIFE_GOAL_PERIOD, periodMatchesGoalType } from "./validation.js";

test("life goals only accept the life sentinel period", () => {
  expect(periodMatchesGoalType("life", LIFE_GOAL_PERIOD)).toBe(true);
  expect(periodMatchesGoalType("life", "2026")).toBe(false);
});

test("dated goals reject the life sentinel", () => {
  expect(periodMatchesGoalType("year", LIFE_GOAL_PERIOD)).toBe(false);
  expect(periodMatchesGoalType("year", "2026")).toBe(true);
});
