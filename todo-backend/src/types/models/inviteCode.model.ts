import type { Document, Types } from "mongoose";

export interface IInviteCode {
  code: string;
  /** Admin memo: who this invite is intended for */
  name: string;
  expiresAt: Date;
  usedAt: Date | null;
  usedByUsername: string | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInviteCodeDocument extends IInviteCode, Document {
  _id: Types.ObjectId;
}
