import { Schema, model } from "mongoose";
import type { IInviteCodeDocument } from "../types/index.js";

const inviteCodeSchema = new Schema<IInviteCodeDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["signup", "reset"],
      default: "signup",
    },
    targetUsername: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [80, "Name cannot exceed 80 characters"],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    usedByUsername: {
      type: String,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const InviteCode = model<IInviteCodeDocument>(
  "InviteCode",
  inviteCodeSchema
);
