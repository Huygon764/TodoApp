import type { Request } from "express";
import type { IUserDocument } from "./models/user.model.js";

export interface JwtPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
  userDoc: IUserDocument;
}

export interface OptionalAuthRequest extends Request {
  user?: JwtPayload;
  userDoc?: IUserDocument;
}
