import { Schema, model } from "mongoose";
import type { IHabitLogDocument } from "../types/index.js";

/**
 * A completion is the existence of a log document for (habit, date). Un-ticking
 * deletes it. There is no "completed" flag and no way to log a date other than
 * the user's current day (enforced in the controller).
 */
const habitLogSchema = new Schema<IHabitLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    habitId: {
      type: Schema.Types.ObjectId,
      ref: "Habit",
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One log per habit per day.
habitLogSchema.index({ userId: 1, habitId: 1, date: 1 }, { unique: true });
// Fast lookup of everything logged on a given day (perfect-day, panel).
habitLogSchema.index({ userId: 1, date: 1 });

export const HabitLog = model<IHabitLogDocument>("HabitLog", habitLogSchema);
