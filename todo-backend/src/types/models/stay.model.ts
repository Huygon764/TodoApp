import type { Document, Types } from "mongoose";

export interface IStayDay {
  userId: Types.ObjectId;
  date: string; // YYYY-MM-DD in the user's timezone
  level: 6 | 8 | 12;
  status: "idle" | "running" | "paused" | "done";
  stayedMs: number;
  runningSince: Date | null;
  pausedAs: "escape" | "out" | null;
  pausedSince: Date | null;
  escapes: number;
  outMs: number;
  levelChanges: { at: Date; from: 6 | 8 | 12; to: 6 | 8 | 12 }[];
  doneAt: Date | null;
  startedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStayDayDocument extends IStayDay, Document {
  _id: Types.ObjectId;
}

export interface IPomodoro {
  userId: Types.ObjectId;
  workMin: number;
  restMin: number;
  phase: "idle" | "work" | "rest";
  phaseStartedAt: Date | null;
  pausedAt: Date | null;
  pausedMs: number;
  roundsByDate: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPomodoroDocument extends IPomodoro, Document {
  _id: Types.ObjectId;
}
