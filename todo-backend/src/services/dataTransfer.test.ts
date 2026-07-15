import { test, expect } from "bun:test";
import { validateImportPayload, COLLECTIONS, EXPORT_VERSION } from "./dataTransfer.js";

test("COLLECTIONS keys are unique", () => {
  const keys = COLLECTIONS.map((c) => c.key);
  expect(new Set(keys).size).toBe(keys.length);
});

test("rejects a non-object body", () => {
  expect(validateImportPayload(null).ok).toBe(false);
  expect(validateImportPayload("x").ok).toBe(false);
});

test("rejects an unknown version", () => {
  expect(validateImportPayload({ version: 999, data: {} }).ok).toBe(false);
});

test("rejects a missing data object", () => {
  expect(validateImportPayload({ version: EXPORT_VERSION }).ok).toBe(false);
});

test("rejects a many-collection that is not an array", () => {
  const r = validateImportPayload({ version: EXPORT_VERSION, data: { days: {} } });
  expect(r.ok).toBe(false);
});

test("rejects freetimeTodo that is an array", () => {
  const r = validateImportPayload({ version: EXPORT_VERSION, data: { freetimeTodo: [] } });
  expect(r.ok).toBe(false);
});

test("accepts freetimeTodo as null", () => {
  const r = validateImportPayload({ version: EXPORT_VERSION, data: { freetimeTodo: null } });
  expect(r.ok).toBe(true);
});

test("accepts a well-formed payload with missing keys", () => {
  const r = validateImportPayload({
    version: EXPORT_VERSION,
    data: { days: [], habits: [] },
  });
  expect(r.ok).toBe(true);
});
