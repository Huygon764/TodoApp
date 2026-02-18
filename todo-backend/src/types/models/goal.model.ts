import type { Document, Types } from "mongoose";

export interface IGoalItem {
  title: string;
  completed: boolean;
  order: number;
}

export interface IGoal {
  userId: Types.ObjectId;
  type: "week" | "month";
  period: string;
  items: IGoalItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IGoalDocument extends IGoal, Document {
  _id: Types.ObjectId;
}
