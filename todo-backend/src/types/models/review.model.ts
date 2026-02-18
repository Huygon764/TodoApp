import type { Document, Types } from "mongoose";

export interface IReview {
  userId: Types.ObjectId;
  type: "week" | "month";
  period: string; // week: 2024-W03, month: 2024-01
  goodThings: string[];
  badThings: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReviewDocument extends IReview, Document {
  _id: Types.ObjectId;
}
