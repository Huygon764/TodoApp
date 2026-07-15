import { Schema, model } from "mongoose";
import type { IHabitDocument } from "../types/index.js";

const habitSchema = new Schema<IHabitDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
    },
    // 1 = Monday .. 7 = Sunday. A habit is scheduled on a date when the date's
    // ISO weekday is in this list. Non-empty; defaults to every day.
    daysOfWeek: {
      type: [Number],
      required: true,
      default: [1, 2, 3, 4, 5, 6, 7],
      validate: {
        validator: (value: number[]) =>
          Array.isArray(value) &&
          value.length > 0 &&
          value.every((d) => Number.isInteger(d) && d >= 1 && d <= 7),
        message: "daysOfWeek must be a non-empty list of integers between 1 and 7",
      },
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    // Soft delete: archived habits drop out of the panel but keep their logs.
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

habitSchema.index({ userId: 1, order: 1 });

export const Habit = model<IHabitDocument>("Habit", habitSchema);
