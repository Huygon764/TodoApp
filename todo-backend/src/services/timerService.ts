import { Timer } from "../models/index.js";
import type { ITimerDocument } from "../types/index.js";
import {
  settleTimer,
  toTimerState,
  type TimerData,
  type TimerState,
} from "./timerLogic.js";

function toData(doc: ITimerDocument): TimerData {
  return {
    lengthMs: doc.lengthMs,
    label: doc.label,
    status: doc.status,
    endsAt: doc.endsAt ?? null,
    remainingMs: doc.remainingMs ?? null,
    doneAt: doc.doneAt ?? null,
  };
}

function applyData(doc: ITimerDocument, data: TimerData): void {
  doc.set({
    lengthMs: data.lengthMs,
    label: data.label,
    status: data.status,
    endsAt: data.endsAt,
    remainingMs: data.remainingMs,
    doneAt: data.doneAt,
  });
}

/**
 * Settle a timer that reached zero, optionally apply one write, and return the
 * state. Saves only when something changed.
 */
export async function runTimer(
  userId: string,
  mutate?: (t: TimerData, now: Date) => TimerData,
  now: Date = new Date(),
): Promise<TimerState> {
  const doc = await Timer.findOneAndUpdate(
    { userId },
    { $setOnInsert: { status: "stopped" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const before = toData(doc!);
  let data = settleTimer(before, now);
  if (mutate) data = mutate(data, now);
  if (data !== before) {
    applyData(doc!, data);
    await doc!.save();
  }
  return toTimerState(data, now);
}
