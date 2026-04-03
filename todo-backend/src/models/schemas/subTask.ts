import { Schema } from "mongoose";

export const subTaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

export const subTaskTitleOnlySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
  },
  { _id: false }
);
