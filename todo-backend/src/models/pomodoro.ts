import { Schema, model } from "mongoose";
import type { IPomodoroDocument } from "../types/index.js";

/** One document per user: the preset, the current phase and this week's rounds. */
const pomodoroSchema = new Schema<IPomodoroDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    workMin: { type: Number, default: 25, min: 1, max: 120 },
    restMin: { type: Number, default: 5, min: 1, max: 60 },
    phase: { type: String, enum: ["idle", "work", "rest"], default: "idle" },
    phaseStartedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    pausedMs: { type: Number, default: 0, min: 0 },
    roundsByDate: { type: Map, of: Number, default: {} },
  },
  { timestamps: true },
);

export const Pomodoro = model<IPomodoroDocument>("Pomodoro", pomodoroSchema);
