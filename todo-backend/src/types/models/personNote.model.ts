import type { Document, Types } from "mongoose";

export interface IPersonNote {
  userId: Types.ObjectId;
  name: string;
  notes: string[];
  order: number;
  /** "person" for people, "object" for things to remember (movies, apps...). */
  category: "person" | "object";
  createdAt: Date;
  updatedAt: Date;
}

export interface IPersonNoteDocument extends IPersonNote, Document {
  _id: Types.ObjectId;
}
