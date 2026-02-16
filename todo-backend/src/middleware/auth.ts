import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { env } from "../config/index.js";
import { User } from "../models/index.js";
import { catchAsync, unauthorized } from "../utils/index.js";
import { MESSAGES } from "../constants/index.js";
import type { JwtPayload } from "../types/index.js";

/**
 * Authentication middleware - reads JWT from httpOnly cookie
 */
export const authenticate: RequestHandler = catchAsync(async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    throw unauthorized(MESSAGES.AUTH.TOKEN_REQUIRED);
  }

  const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
  const user = await User.findById(decoded.userId);

  if (!user || !user.isActive) {
    throw unauthorized(MESSAGES.AUTH.TOKEN_INVALID);
  }

  req.user = decoded;
  req.userDoc = user;
  next();
});
