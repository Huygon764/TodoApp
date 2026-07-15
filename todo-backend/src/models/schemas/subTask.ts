import { Schema } from "mongoose";

export const subTaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
    // Optional repetition counter. When `target` is set the sub-task is a
    // counter (e.g. "pull up" x20); `count` tracks progress toward it.
    target: { type: Number, min: 2, max: 999 },
    count: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

export const subTaskTitleOnlySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    // Templates carry only the target; `count` starts at 0 on materialization.
    target: { type: Number, min: 2, max: 999 },
  },
  { _id: false }
);
