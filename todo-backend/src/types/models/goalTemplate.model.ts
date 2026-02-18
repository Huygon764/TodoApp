import type { Document, Types } from "mongoose";

export interface IGoalTemplateItem {
  title: string;
  order: number;
}

export interface IGoalTemplate {
  userId: Types.ObjectId;
  type: "week" | "month";
  items: IGoalTemplateItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IGoalTemplateDocument extends IGoalTemplate, Document {
  _id: Types.ObjectId;
}
