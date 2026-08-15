import type { Document, Types } from "mongoose";

export interface IHabit {
  userId: Types.ObjectId;
  name: string;
  /** 1 = Monday .. 7 = Sunday; non-empty. */
  daysOfWeek: number[];
  order: number;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHabitDocument extends IHabit, Document {
  _id: Types.ObjectId;
}

export type HabitLogKind = "done" | "skipped";

export interface IHabitLog {
  userId: Types.ObjectId;
  habitId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  kind?: HabitLogKind;
  createdAt: Date;
}

export interface IHabitLogDocument extends IHabitLog, Document {
  _id: Types.ObjectId;
}
