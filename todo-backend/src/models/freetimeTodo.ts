import { Schema, model } from "mongoose";
import type { IFreetimeTodoDocument, IFreetimeTodoItem } from "../types/index.js";
import { subTaskSchema } from "./schemas/subTask.js";

const freetimeTodoItemSchema = new Schema<IFreetimeTodoItem>(
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

const freetimeTodoSchema = new Schema<IFreetimeTodoDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: {
      type: [freetimeTodoItemSchema],
      default: [],
    },
  },
  { timestamps: true, collection: "freetimetodos" }
);

freetimeTodoSchema.index({ userId: 1 }, { unique: true });

export const FreetimeTodo = model<IFreetimeTodoDocument>(
  "FreetimeTodo",
  freetimeTodoSchema
);

