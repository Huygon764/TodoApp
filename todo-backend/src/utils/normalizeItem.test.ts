import { test, expect } from "bun:test";
import { normalizeItem } from "./normalizeItem.js";

test("preserves an item counter target and count", () => {
  const result = normalizeItem({ title: "Pull up", target: 20, count: 7 }, 0);
  expect(result.target).toBe(20);
  expect(result.count).toBe(7);
});

test("defaults count to 0 when a target is present without a count", () => {
  const result = normalizeItem({ title: "Pull up", target: 20 }, 0);
  expect(result.count).toBe(0);
});

test("clamps count into 0..target", () => {
  expect(normalizeItem({ title: "x", target: 20, count: 99 }, 0).count).toBe(20);
  expect(normalizeItem({ title: "x", target: 20, count: -5 }, 0).count).toBe(0);
});

test("drops a target below 2 and its count", () => {
  const result = normalizeItem({ title: "x", target: 1, count: 1 }, 0);
  expect(result.target).toBeUndefined();
  expect(result.count).toBeUndefined();
});

test("leaves a plain item without counter fields", () => {
  const result = normalizeItem({ title: "Read", completed: false }, 0);
  expect(result.target).toBeUndefined();
  expect(result.count).toBeUndefined();
});

test("preserves counter fields on sub-tasks", () => {
  const result = normalizeItem(
    { title: "Gym", subTasks: [{ title: "Pull up", target: 20, count: 12 }] },
    0,
  );
  expect(result.subTasks?.[0]).toMatchObject({
    title: "Pull up",
    target: 20,
    count: 12,
  });
});
