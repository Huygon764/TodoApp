import { Schema, model } from "mongoose";
import type { IGoalTemplateDocument, IGoalTemplateItem } from "../types/index.js";

const goalTemplateItemSchema = new Schema<IGoalTemplateItem>(
  {
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const goalTemplateSchema = new Schema<IGoalTemplateDocument>(
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
      enum: ["week", "month", "year"],
      index: true,
    },
    items: {
      type: [goalTemplateItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

goalTemplateSchema.index({ userId: 1, type: 1 }, { unique: true });

export const GoalTemplate = model<IGoalTemplateDocument>(
  "GoalTemplate",
  goalTemplateSchema
);
