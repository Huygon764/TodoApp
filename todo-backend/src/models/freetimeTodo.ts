import { Schema, model } from "mongoose";
import type { IFreetimeTodoDocument, IFreetimeTodoItem } from "../types/index.js";
import { createTodoItemSchema } from "./schemas/todoItem.js";

const freetimeTodoItemSchema = createTodoItemSchema<IFreetimeTodoItem>();

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

