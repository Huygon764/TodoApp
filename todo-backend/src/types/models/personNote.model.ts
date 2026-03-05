import type { Document, Types } from "mongoose";

export interface IPersonNote {
  userId: Types.ObjectId;
  name: string;
  notes: string[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPersonNoteDocument extends IPersonNote, Document {
  _id: Types.ObjectId;
}
