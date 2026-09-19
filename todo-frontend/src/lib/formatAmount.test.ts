import { test, expect } from "bun:test";
import { formatAmountInput, parseAmountInput } from "./formatAmount.js";

test("groups thousands with a dot", () => {
  expect(formatAmountInput("70000")).toBe("70.000");
});

test("deleting the leading digit of 70.000 keeps the remaining zeros", () => {
  expect(formatAmountInput("0.000")).toBe("0.000");
});

test("replacing 7 with 8 in 70.000 becomes 80.000", () => {
  expect(formatAmountInput("80.000")).toBe("80.000");
});

test("empty input stays empty", () => {
  expect(formatAmountInput("")).toBe("");
});

test("parse treats grouped digits as a number", () => {
  expect(parseAmountInput("80.000")).toBe(80000);
});

test("parse of leftover zeros is zero", () => {
  expect(parseAmountInput("0.000")).toBe(0);
});
