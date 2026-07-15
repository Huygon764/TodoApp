import { test, expect } from "bun:test";
import { counterConsistency } from "./builders.js";

// counterConsistency is an express-validator CustomValidator: it returns true
// when the items array is consistent and throws otherwise. It only inspects
// the first argument, so we pass an empty meta object.
const meta = {} as never;
const check = (items: unknown) => counterConsistency(items, meta);

test("passes a plain item with neither target nor sub-tasks", () => {
  expect(check([{ title: "Read", completed: false }])).toBe(true);
});

test("passes a valid counter item", () => {
  expect(check([{ title: "Pull up", target: 20, count: 7 }])).toBe(true);
});

test("rejects an item with both target and sub-tasks", () => {
  expect(() =>
    check([{ title: "Gym", target: 20, subTasks: [{ title: "Pull up" }] }]),
  ).toThrow("An item cannot have both a target and sub-tasks");
});

test("allows an item with an empty sub-tasks array and a target", () => {
  expect(check([{ title: "Pull up", target: 20, subTasks: [] }])).toBe(true);
});

test("rejects count greater than target", () => {
  expect(() => check([{ title: "Pull up", target: 20, count: 21 }])).toThrow(
    "count must be between 0 and target",
  );
});

test("rejects count without a target", () => {
  expect(() => check([{ title: "Pull up", count: 3 }])).toThrow(
    "count requires a target",
  );
});

test("rejects a sub-task count greater than its target", () => {
  expect(() =>
    check([
      {
        title: "Gym",
        subTasks: [{ title: "Pull up", target: 20, count: 30 }],
      },
    ]),
  ).toThrow("sub-task count must be between 0 and target");
});

test("passes a parent with valid counter sub-tasks", () => {
  expect(
    check([
      {
        title: "Gym",
        subTasks: [
          { title: "Pull up", target: 20, count: 12 },
          { title: "Push up", target: 50, count: 50 },
        ],
      },
    ]),
  ).toBe(true);
});

test("ignores a non-array value", () => {
  expect(check(undefined)).toBe(true);
});
