import type { Document, Types } from "mongoose";

export interface IDayTodoItem {
  title: string;
  completed: boolean;
  order: number;
}

export interface IDayTodo {
  userId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  items: IDayTodoItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IDayTodoDocument extends IDayTodo, Document {
  _id: Types.ObjectId;
}
