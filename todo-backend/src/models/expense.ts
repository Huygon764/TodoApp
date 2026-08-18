import { Schema, model } from "mongoose";
import type { IExpenseDocument } from "../types/index.js";

const expenseSchema = new Schema<IExpenseDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

expenseSchema.index({ userId: 1, date: -1 });

export const Expense = model<IExpenseDocument>("Expense", expenseSchema);
