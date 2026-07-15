import type { Document, Types } from "mongoose";

export interface IGoalSubTask {
  title: string;
  completed: boolean;
  target?: number;
  count?: number;
}

export interface IGoalItem {
  title: string;
  completed: boolean;
  order: number;
  target?: number;
  count?: number;
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
