import { Schema, model } from "mongoose";
import type { IReviewDocument } from "../types/index.js";

const reviewSchema = new Schema<IReviewDocument>(
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
      enum: ["week", "month"],
      default: "week",
      index: true,
    },
    period: {
      type: String,
      required: true,
      index: true,
    },
    goodThings: {
      type: [String],
      default: [],
    },
    badThings: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

reviewSchema.index({ userId: 1, type: 1, period: 1 }, { unique: true });

export const Review = model<IReviewDocument>("Review", reviewSchema);
