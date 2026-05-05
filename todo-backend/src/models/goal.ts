import { Schema, model } from "mongoose";
import type { IGoalDocument, IGoalItem } from "../types/index.js";
import { createTodoItemSchema } from "./schemas/todoItem.js";

const goalItemSchema = createTodoItemSchema<IGoalItem>();

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
      enum: ["week", "month", "year"],
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
