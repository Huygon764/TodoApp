import { Schema, model } from "mongoose";
import type { IGoalDocument, IGoalItem } from "../types/index.js";

const goalItemSchema = new Schema<IGoalItem>(
  {
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
    order: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const goalSchema = new Schema<IGoalDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["week", "month"],
      index: true,
    },
    period: {
      type: String,
      required: true,
      index: true,
    },
    items: {
      type: [goalItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, type: 1, period: 1 }, { unique: true });

export const Goal = model<IGoalDocument>("Goal", goalSchema);
