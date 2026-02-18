import type { Document, Types } from "mongoose";

export interface IRecurringTemplateItem {
  title: string;
  order: number;
}

export interface IRecurringTemplate {
  userId: Types.ObjectId;
  type: "week" | "month" | "year";
  items: IRecurringTemplateItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IRecurringTemplateDocument extends IRecurringTemplate, Document {
  _id: Types.ObjectId;
}
