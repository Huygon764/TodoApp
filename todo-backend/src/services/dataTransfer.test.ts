import "../testEnv.js"; // config/env.ts throws at import without these variables
import { test, expect } from "bun:test";
import { validateImportPayload, COLLECTIONS, EXPORT_VERSION, pickFields, settleStayExport } from "./dataTransfer.js";

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

test("export/import covers StayDay and only the pomodoro settings", () => {
  const stay = COLLECTIONS.find((c) => c.key === "stayDays");
  const pomo = COLLECTIONS.find((c) => c.key === "pomodoroSettings");
  expect(stay?.kind).toBe("many");
  expect(pomo?.kind).toBe("one");
  expect(pomo?.fields).toEqual(["workMin", "restMin"]);
});

test("pickFields drops runtime pomodoro state", () => {
  const doc = { workMin: 50, restMin: 10, phase: "work", roundsByDate: { a: 1 } };
  expect(pickFields(doc, ["workMin", "restMin"])).toEqual({ workMin: 50, restMin: 10 });
});

test("accepts stayDays and pomodoroSettings, or neither", () => {
  expect(
    validateImportPayload({
      version: EXPORT_VERSION,
      data: { stayDays: [{ date: "2026-11-24", level: 8 }], pomodoroSettings: { workMin: 50, restMin: 10 } },
    }).ok,
  ).toBe(true);
  expect(validateImportPayload({ version: EXPORT_VERSION, data: {} }).ok).toBe(true);
  expect(
    validateImportPayload({ version: EXPORT_VERSION, data: { pomodoroSettings: null } }).ok,
  ).toBe(true);
});

test("rejects malformed stayDays and out-of-range pomodoro settings", () => {
  expect(
    validateImportPayload({ version: EXPORT_VERSION, data: { stayDays: {} } }).ok,
  ).toBe(false);
  expect(
    validateImportPayload({ version: EXPORT_VERSION, data: { pomodoroSettings: [] } }).ok,
  ).toBe(false);
  expect(
    validateImportPayload({
      version: EXPORT_VERSION,
      data: { pomodoroSettings: { workMin: 500, restMin: 5 } },
    }).ok,
  ).toBe(false);
});

test("export settles a past stay day left running", () => {
  const doc = {
    date: "2026-11-20",
    level: 8,
    status: "running",
    stayedMs: 0,
    runningSince: new Date("2026-11-20T10:00:00Z"),
    escapes: 0,
    outMs: 0,
  };
  const now = new Date("2026-11-24T12:00:00Z");
  const [out] = settleStayExport([doc], "UTC", now);
  expect(out!.status).toBe("done");
  const [idle] = settleStayExport([{ ...doc, status: "idle" }], "UTC", now);
  expect(idle!.status).toBe("idle");
});

test("export settles a past day that missed its level", () => {
  const doc = {
    date: "2026-11-20",
    level: 8,
    status: "running",
    stayedMs: 0,
    runningSince: new Date("2026-11-20T20:00:00Z"),
    escapes: 0,
    outMs: 0,
  };
  const now = new Date("2026-11-24T12:00:00Z");
  const [out] = settleStayExport([doc], "UTC", now);
  expect(out!.status).toBe("idle");
  expect(out!.stayedMs).toBe(4 * 3_600_000);
  expect(out!.runningSince).toBeNull();
  expect(out!.pausedAs).toBeNull();
  expect(out!.pausedSince).toBeNull();
});

test("export settles a past day paused as out", () => {
  const doc = {
    date: "2026-11-20",
    level: 8,
    status: "paused",
    stayedMs: 2 * 3_600_000,
    runningSince: null,
    pausedAs: "out",
    pausedSince: new Date("2026-11-20T22:00:00Z"),
    escapes: 0,
    outMs: 0,
  };
  const now = new Date("2026-11-24T12:00:00Z");
  const [out] = settleStayExport([doc], "UTC", now);
  expect(out!.status).toBe("idle");
  expect(out!.stayedMs).toBe(2 * 3_600_000);
  expect(out!.outMs).toBe(2 * 3_600_000);
  expect(out!.pausedAs).toBeNull();
  expect(out!.pausedSince).toBeNull();
});

test("accepts a well-formed payload with missing keys", () => {
  const r = validateImportPayload({
    version: EXPORT_VERSION,
    data: { days: [], habits: [] },
  });
  expect(r.ok).toBe(true);
});
