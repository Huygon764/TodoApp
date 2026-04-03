import { Schema, model } from "mongoose";
import type { IDateTemplateDocument, IDateTemplateItem } from "../types/index.js";
import { subTaskTitleOnlySchema } from "./schemas/subTask.js";

const dateTemplateItemSchema = new Schema<IDateTemplateItem>(
  {
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
    subTasks: {
      type: [subTaskTitleOnlySchema],
      default: undefined,
    },
  },
  { _id: false }
);

const dateTemplateSchema = new Schema<IDateTemplateDocument>(
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
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    items: {
      type: [dateTemplateItemSchema],
      default: [],
    },
  },
  { timestamps: true, collection: "datetemplates" }
);

dateTemplateSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DateTemplate = model<IDateTemplateDocument>(
  "DateTemplate",
  dateTemplateSchema
);
