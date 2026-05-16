import type { Document, Types } from "mongoose";

export interface IDayTodoSubTask {
  title: string;
  completed: boolean;
}

export interface IDayTodoItem {
  title: string;
  completed: boolean;
  order: number;
  subTasks?: IDayTodoSubTask[];
  /** Original date (YYYY-MM-DD) this task was first postponed from */
  carriedFrom?: string;
  /** Number of times this task has been carried over to a later day */
  postponeCount?: number;
}

export interface IDayTodo {
  userId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  items: IDayTodoItem[];
  /** One-line end-of-day reflection (breadcrumb for assisted review) */
  reflection?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDayTodoDocument extends IDayTodo, Document {
  _id: Types.ObjectId;
}
