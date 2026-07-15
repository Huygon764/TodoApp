import type { Document, Types } from "mongoose";

export interface IFreetimeSubTask {
  title: string;
  completed: boolean;
  target?: number;
  count?: number;
}

export interface IFreetimeTodoItem {
  title: string;
  completed: boolean;
  order: number;
  target?: number;
  count?: number;
  subTasks?: IFreetimeSubTask[];
}

export interface IFreetimeTodo {
  userId: Types.ObjectId;
  items: IFreetimeTodoItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IFreetimeTodoDocument extends IFreetimeTodo, Document {
  _id: Types.ObjectId;
}

