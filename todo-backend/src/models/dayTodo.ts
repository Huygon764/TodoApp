import { Schema, model } from "mongoose";
import type { IDayTodoDocument, IDayTodoItem } from "../types/index.js";

const subTaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const dayTodoItemSchema = new Schema<IDayTodoItem>(
  {
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
    order: { type: Number, required: true, default: 0 },
    subTasks: {
      type: [subTaskSchema],
      default: undefined,
    },
  },
  { _id: false }
);

const dayTodoSchema = new Schema<IDayTodoDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"],
      index: true,
    },
    items: {
      type: [dayTodoItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

dayTodoSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DayTodo = model<IDayTodoDocument>("DayTodo", dayTodoSchema);
