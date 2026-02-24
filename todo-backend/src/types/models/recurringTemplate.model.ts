import type { Document, Types } from "mongoose";

export interface IRecurringTemplateDayOfYear {
  month: number; // 1-12
  day: number; // 1-31
}

export interface IRecurringTemplateItem {
  title: string;
  order: number;
  /** 1-7, 1 = Monday, 7 = Sunday (for type = "week") */
  daysOfWeek?: number[];
  /** 1-31 (for type = "month") */
  daysOfMonth?: number[];
  /** Specific days in year (for type = "year") */
  datesOfYear?: IRecurringTemplateDayOfYear[];
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
