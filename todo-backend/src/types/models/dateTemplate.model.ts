import type { Document, Types } from "mongoose";

export interface IDateTemplateSubTask {
  title: string;
}

export interface IDateTemplateItem {
  title: string;
  order: number;
  subTasks?: IDateTemplateSubTask[];
}

export interface IDateTemplate {
  userId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  items: IDateTemplateItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IDateTemplateDocument extends IDateTemplate, Document {
  _id: Types.ObjectId;
}
