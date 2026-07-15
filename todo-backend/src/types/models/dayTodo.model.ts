import type { Document, Types } from "mongoose";

export interface IDayTodoSubTask {
  title: string;
  completed: boolean;
  /** Repetition target; when set, this sub-task is a counter. */
  target?: number;
  /** Progress toward `target`; 0..target. */
  count?: number;
}

export interface IDayTodoItem {
  title: string;
  completed: boolean;
  order: number;
  /** Repetition target; when set, this item is a counter (no subTasks). */
  target?: number;
  /** Progress toward `target`; 0..target. */
  count?: number;
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
  /** Self-reported mood for the day, 1 (low) to 5 (high). */
  mood?: number;
  /** Self-reported energy for the day, 1 (low) to 5 (high). */
  energy?: number;
  /** One line of gratitude for the day. */
  gratitude?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDayTodoDocument extends IDayTodo, Document {
  _id: Types.ObjectId;
}
