import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../config/index.js";
import type { IUserDocument, IUserModel } from "../types/index.js";

const userSchema = new Schema<IUserDocument, IUserModel>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
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
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
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
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
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
