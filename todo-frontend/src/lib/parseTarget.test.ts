import { test, expect } from "bun:test";
import { parseTarget } from "./parseTarget.js";

test("splits a trailing xN into title and target", () => {
  expect(parseTarget("Pull up x20")).toEqual({ title: "Pull up", target: 20 });
});

test("is case-insensitive", () => {
  expect(parseTarget("Do it X3")).toEqual({ title: "Do it", target: 3 });
});

test("trims surrounding whitespace", () => {
  expect(parseTarget("  Push up x50  ")).toEqual({ title: "Push up", target: 50 });
});

test("x1 is not a counter", () => {
  expect(parseTarget("Read x1")).toEqual({ title: "Read x1" });
});

test("x0 is not a counter", () => {
  expect(parseTarget("Read x0")).toEqual({ title: "Read x0" });
});

test("a suffix with no title is kept literal", () => {
  expect(parseTarget("x20")).toEqual({ title: "x20" });
});

test("a dangling x is not a counter", () => {
  expect(parseTarget("Matrix x")).toEqual({ title: "Matrix x" });
});

test("a plain title is unchanged", () => {
  expect(parseTarget("Read a book")).toEqual({ title: "Read a book" });
});

test("only the final suffix is parsed", () => {
  expect(parseTarget("Set x2 done x10")).toEqual({ title: "Set x2 done", target: 10 });
});

test("more than three digits is not parsed", () => {
  expect(parseTarget("Count x1000")).toEqual({ title: "Count x1000" });
});
