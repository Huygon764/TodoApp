import { Schema, model } from "mongoose";
import type {
  IRecurringTemplateDayOfYear,
  IRecurringTemplateDocument,
  IRecurringTemplateItem,
} from "../types/index.js";

const recurringTemplateDayOfYearSchema = new Schema<IRecurringTemplateDayOfYear>(
  {
    month: { type: Number, min: 1, max: 12, required: true },
    day: { type: Number, min: 1, max: 31, required: true },
  },
  { _id: false }
);

const recurringTemplateItemSchema = new Schema<IRecurringTemplateItem>(
  {
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
    // For weekly templates: 1-7 (1 = Monday, 7 = Sunday)
    daysOfWeek: {
      type: [Number],
      default: undefined,
      validate: {
        validator: (value: number[] | undefined) =>
          !value || value.every((d) => Number.isInteger(d) && d >= 1 && d <= 7),
        message: "daysOfWeek must contain integers between 1 and 7",
      },
    },
    // For monthly templates: 1-31
    daysOfMonth: {
      type: [Number],
      default: undefined,
      validate: {
        validator: (value: number[] | undefined) =>
          !value || value.every((d) => Number.isInteger(d) && d >= 1 && d <= 31),
        message: "daysOfMonth must contain integers between 1 and 31",
      },
    },
    // For yearly templates: array of { month, day }
    datesOfYear: {
      type: [recurringTemplateDayOfYearSchema],
      default: undefined,
    },
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
