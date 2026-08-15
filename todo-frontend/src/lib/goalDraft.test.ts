import { describe, expect, test } from "bun:test";
import { isSpuriousReorder, shouldPersistGoalItemsOnClose } from "./goalDraft.js";

describe("isSpuriousReorder", () => {
  test("ignores empty next when the list still had items", () => {
    expect(isSpuriousReorder([], [{ id: "a" }, { id: "b" }])).toBe(true);
  });

  test("allows a real reorder that keeps items", () => {
    expect(isSpuriousReorder([{ id: "b" }, { id: "a" }], [{ id: "a" }, { id: "b" }])).toBe(false);
  });

  test("allows empty when the list was already empty", () => {
    expect(isSpuriousReorder([], [])).toBe(false);
  });
});

describe("shouldPersistGoalItemsOnClose", () => {
  test("does not save empty local over a non-empty server list", () => {
    expect(
      shouldPersistGoalItemsOnClose({
        hasGoal: true,
        localCount: 0,
        serverCount: 3,
        currentOrder: "",
        initialOrder: "a,b,c",
      }),
    ).toBe(false);
  });

  test("saves when the user reordered existing items", () => {
    expect(
      shouldPersistGoalItemsOnClose({
        hasGoal: true,
        localCount: 2,
        serverCount: 2,
        currentOrder: "b,a",
        initialOrder: "a,b",
      }),
    ).toBe(true);
  });

  test("does not save when nothing changed", () => {
    expect(
      shouldPersistGoalItemsOnClose({
        hasGoal: true,
        localCount: 2,
        serverCount: 2,
        currentOrder: "a,b",
        initialOrder: "a,b",
      }),
    ).toBe(false);
  });
});
