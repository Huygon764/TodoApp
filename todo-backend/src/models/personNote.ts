import { Schema, model } from "mongoose";
import type { IPersonNoteDocument } from "../types/index.js";

const personNoteSchema = new Schema<IPersonNoteDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
    },
    notes: {
      type: [String],
      default: [],
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

personNoteSchema.index({ userId: 1, order: 1 });

export const PersonNote = model<IPersonNoteDocument>(
  "PersonNote",
  personNoteSchema
);
