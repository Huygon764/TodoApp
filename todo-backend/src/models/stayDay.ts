import { Schema, model } from "mongoose";
import type { IStayDayDocument } from "../types/index.js";

/** One document per (user, date); the date is in the user's timezone. */
const stayDaySchema = new Schema<IStayDayDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    level: { type: Number, enum: [6, 8, 12], default: 8 },
    status: {
      type: String,
      enum: ["idle", "running", "paused", "done"],
      default: "idle",
    },
    stayedMs: { type: Number, default: 0, min: 0 },
    runningSince: { type: Date, default: null },
    pausedAs: { type: String, enum: ["escape", "out", null], default: null },
    pausedSince: { type: Date, default: null },
    escapes: { type: Number, default: 0, min: 0 },
    outMs: { type: Number, default: 0, min: 0 },
    levelChanges: {
      type: [
        new Schema(
          {
            at: { type: Date, required: true },
            from: { type: Number, enum: [6, 8, 12], required: true },
            to: { type: Number, enum: [6, 8, 12], required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    doneAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

stayDaySchema.index({ userId: 1, date: 1 }, { unique: true });

export const StayDay = model<IStayDayDocument>("StayDay", stayDaySchema);
