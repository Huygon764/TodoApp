import { Schema, model } from "mongoose";
import type { IDayTodoDocument, IDayTodoItem } from "../types/index.js";
import { createTodoItemSchema } from "./schemas/todoItem.js";

const dayTodoItemSchema = createTodoItemSchema<IDayTodoItem>();

// Carry-over metadata. Added only to dayTodo items so the shared item
// factory (also used by goal/freetimeTodo) stays unaffected.
dayTodoItemSchema.add({
  carriedFrom: { type: String },
  postponeCount: { type: Number },
});

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
    reflection: {
      type: String,
      default: "",
      trim: true,
    },
    mood: {
      type: Number,
      min: 1,
      max: 5,
    },
    energy: {
      type: Number,
      min: 1,
      max: 5,
    },
    gratitude: {
      type: String,
      default: "",
      trim: true,
      maxlength: 280,
    },
  },
  { timestamps: true }
);

dayTodoSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DayTodo = model<IDayTodoDocument>("DayTodo", dayTodoSchema);
