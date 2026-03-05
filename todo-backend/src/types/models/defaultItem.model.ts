import type { Document, Types } from "mongoose";

export interface IDefaultItemSubTask {
  title: string;
}

export interface IDefaultItem {
  userId: Types.ObjectId;
  title: string;
  order: number;
  subTasks?: IDefaultItemSubTask[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IDefaultItemDocument extends IDefaultItem, Document {
  _id: Types.ObjectId;
}
