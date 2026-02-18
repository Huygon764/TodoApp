import { Schema, model } from "mongoose";
import type { IRecurringTemplateDocument, IRecurringTemplateItem } from "../types/index.js";

const recurringTemplateItemSchema = new Schema<IRecurringTemplateItem>(
  {
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const recurringTemplateSchema = new Schema<IRecurringTemplateDocument>(
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
      type: [recurringTemplateItemSchema],
      default: [],
    },
  },
  { timestamps: true, collection: "recurringtemplates" }
);

recurringTemplateSchema.index({ userId: 1, type: 1 }, { unique: true });

export const RecurringTemplate = model<IRecurringTemplateDocument>(
  "RecurringTemplate",
  recurringTemplateSchema
);
