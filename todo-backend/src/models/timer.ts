import { Schema, model } from "mongoose";
import type { ITimerDocument } from "../types/index.js";

/** One document per user: the last length and label, and the countdown state. */
const timerSchema = new Schema<ITimerDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    lengthMs: { type: Number, default: 600_000, min: 60_000, max: 86_400_000 },
    label: { type: String, default: "", maxlength: 40 },
    status: {
      type: String,
      enum: ["stopped", "running", "paused", "done"],
      default: "stopped",
    },
    endsAt: { type: Date, default: null },
    remainingMs: { type: Number, default: null, min: 0 },
    doneAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Timer = model<ITimerDocument>("Timer", timerSchema);
