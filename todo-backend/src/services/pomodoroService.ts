import { Pomodoro } from "../models/index.js";
import type { IPomodoroDocument } from "../types/index.js";
import {
  advancePomodoro,
  pruneRounds,
  toPomodoroState,
  type PomodoroData,
  type PomodoroState,
} from "./pomodoroLogic.js";

function toData(doc: IPomodoroDocument): PomodoroData {
  return {
    workMin: doc.workMin,
    restMin: doc.restMin,
    phase: doc.phase,
    phaseStartedAt: doc.phaseStartedAt ?? null,
    pausedAt: doc.pausedAt ?? null,
    pausedMs: doc.pausedMs,
    roundsByDate: Object.fromEntries(doc.roundsByDate ?? []),
  };
}

function applyData(doc: IPomodoroDocument, data: PomodoroData): void {
  doc.set({
    workMin: data.workMin,
    restMin: data.restMin,
    phase: data.phase,
    phaseStartedAt: data.phaseStartedAt,
    pausedAt: data.pausedAt,
    pausedMs: data.pausedMs,
    roundsByDate: new Map(Object.entries(data.roundsByDate)),
  });
}

/**
 * Advance the phases from the timestamps, optionally apply one write, and
 * return the state. A write also prunes rounds to the current week.
 */
export async function runPomodoro(
  userId: string,
  tz: string | null | undefined,
  mutate?: (p: PomodoroData, now: Date) => PomodoroData,
  now: Date = new Date(),
): Promise<PomodoroState> {
  const doc = await Pomodoro.findOneAndUpdate(
    { userId },
    { $setOnInsert: { phase: "idle" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const before = toData(doc!);
  let data = advancePomodoro(before, now, tz);
  if (mutate) data = pruneRounds(mutate(data, now), now, tz);
  if (data !== before) {
    applyData(doc!, data);
    await doc!.save();
  }
  return toPomodoroState(data, now, tz);
}
