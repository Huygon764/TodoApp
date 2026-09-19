import { test, expect } from "bun:test";
import { sortByCompletedLast, sortItemsByCompletion } from "./sortItems.js";

test("sortByCompletedLast keeps incomplete first", () => {
  expect(
    sortByCompletedLast([
      { title: "a", completed: true },
      { title: "b", completed: false },
      { title: "c", completed: true },
    ]).map((s) => s.title),
  ).toEqual(["b", "a", "c"]);
});

test("sortItemsByCompletion moves a newly completed parent last", () => {
  expect(
    sortItemsByCompletion([
      { title: "a", completed: true, order: 0 },
      { title: "b", completed: false, order: 1 },
    ]).map((s) => s.title),
  ).toEqual(["b", "a"]);
});
