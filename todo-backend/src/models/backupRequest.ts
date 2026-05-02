import { Schema, model, type InferSchemaType } from "mongoose";

export const BACKUP_STATUS = [
  "pending",
  "approved",
  "in-progress",
  "completed",
  "denied",
  "expired",
  "failed",
] as const;

export type BackupStatus = (typeof BACKUP_STATUS)[number];

const backupRequestSchema = new Schema(
  {
    triggeredAt: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: BACKUP_STATUS,
      required: true,
      default: "pending",
    },
    fileSize: { type: Number },
    filesSent: { type: Number },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

backupRequestSchema.index({ status: 1, triggeredAt: -1 });

export type BackupRequestDoc = InferSchemaType<typeof backupRequestSchema>;
export const BackupRequest = model("BackupRequest", backupRequestSchema);
