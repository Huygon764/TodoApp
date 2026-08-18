import type { Document, Types } from "mongoose";

export interface IExpense {
  userId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  amount: number; // VND
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExpenseDocument extends IExpense, Document {
  _id: Types.ObjectId;
}
