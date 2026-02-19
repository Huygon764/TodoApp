import type { Document, Types } from "mongoose";

export interface IGoalSubTask {
  title: string;
  completed: boolean;
}

export interface IGoalItem {
  title: string;
  completed: boolean;
  order: number;
  subTasks?: IGoalSubTask[];
}

export interface IGoal {
  userId: Types.ObjectId;
  type: "week" | "month" | "year";
  period: string;
  items: IGoalItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IGoalDocument extends IGoal, Document {
  _id: Types.ObjectId;
}
