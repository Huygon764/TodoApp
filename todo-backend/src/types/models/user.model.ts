import type { Document, Model, Types } from "mongoose";

export interface IUser {
  username: string;
  password: string;
  displayName: string;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  _id: Types.ObjectId;
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateLastLogin(): Promise<IUserDocument>;
}

export interface IUserModel extends Model<IUserDocument> {
  findByUsername(username: string): Promise<IUserDocument | null>;
}
