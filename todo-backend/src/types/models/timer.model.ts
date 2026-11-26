import type { Document, Types } from "mongoose";

export interface ITimer {
  userId: Types.ObjectId;
  lengthMs: number;
  label: string;
  status: "stopped" | "running" | "paused" | "done";
  endsAt: Date | null;
  remainingMs: number | null;
  doneAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITimerDocument extends ITimer, Document {
  _id: Types.ObjectId;
}
