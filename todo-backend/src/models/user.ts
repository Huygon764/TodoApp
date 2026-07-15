import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../config/index.js";
import type { IUserDocument, IUserModel } from "../types/index.js";

const userSchema = new Schema<IUserDocument, IUserModel>(
  {
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ],
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    // Google sign-in identity (absent for username/password accounts).
    googleId: { type: String, unique: true, sparse: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    avatarUrl: { type: String, default: undefined },
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, "Display name cannot exceed 50 characters"],
      default: function (this: IUserDocument) {
        return this.username;
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    timezone: {
      type: String,
      trim: true,
      maxlength: [60, "Timezone cannot exceed 60 characters"],
      default: undefined,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(env.bcryptRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function (
  this: IUserDocument,
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false; // Google-only accounts have no password
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateLastLogin = function (
  this: IUserDocument
): Promise<IUserDocument> {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

userSchema.methods.toJSON = function (this: IUserDocument) {
  const user = this.toObject();
  delete (user as Record<string, unknown>).password;
  return user;
};

userSchema.statics.findByUsername = function (
  this: IUserModel,
  username: string
) {
  return this.findOne({ username });
};

export const User = model<IUserDocument, IUserModel>("User", userSchema);
