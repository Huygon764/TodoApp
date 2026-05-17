import type { Document, Types } from "mongoose";

export type InviteKind = "signup" | "reset";

export interface IInviteCode {
  code: string;
  /** signup: create a new account. reset: change an existing password */
  kind: InviteKind;
  /** For kind="reset": the username whose password will be reset */
  targetUsername: string | null;
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
