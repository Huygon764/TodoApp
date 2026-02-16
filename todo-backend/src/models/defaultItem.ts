import { Schema, model } from "mongoose";
import type { IDefaultItemDocument } from "../types/index.js";

const defaultItemSchema = new Schema<IDefaultItemDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, "Title cannot exceed 500 characters"],
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

defaultItemSchema.index({ userId: 1, order: 1 });

export const DefaultItem = model<IDefaultItemDocument>(
  "DefaultItem",
  defaultItemSchema
);
