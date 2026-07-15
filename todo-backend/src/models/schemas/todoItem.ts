import { Schema } from "mongoose";
import { subTaskSchema } from "./subTask.js";

/**
 * Factory for the shared `{title, completed, order, subTasks}` item schema
 * used by goal/dayTodo/freetimeTodo models.
 */
export function createTodoItemSchema<T>(): Schema<T> {
  return new Schema<T>(
    {
      title: { type: String, required: true, trim: true },
      completed: { type: Boolean, default: false },
      order: { type: Number, required: true, default: 0 },
      // Optional repetition counter, mutually exclusive with subTasks.
      // No default: `count` exists only alongside `target`, set explicitly.
      target: { type: Number, min: 2, max: 999 },
      count: { type: Number, min: 0 },
      subTasks: {
        type: [subTaskSchema],
        default: undefined,
      },
    },
    { _id: false },
  );
}
