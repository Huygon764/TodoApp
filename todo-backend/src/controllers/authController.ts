import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { env } from "../config/index.js";
import { User } from "../models/index.js";
import {
  catchAsync,
  sendSuccess,
  badRequest,
  unauthorized,
} from "../utils/index.js";
import { MESSAGES } from "../constants/index.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  sameSite: "lax" as const,
  // secure: env.nodeEnv === "production",
  secure: false, // false because on vps dont have domain name, only ip address, later when buy domain name, can change this
  path: "/",
};

export const login = catchAsync(async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    throw badRequest(MESSAGES.AUTH.CREDENTIALS_REQUIRED);
  }

  const user = await User.findOne({ username }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw unauthorized(MESSAGES.AUTH.LOGIN_FAILED);
  }

  if (!user.isActive) {
    throw unauthorized(MESSAGES.AUTH.USER_INACTIVE);
  }

  await user.updateLastLogin();

  const token = jwt.sign(
    { userId: user._id.toString(), username: user.username },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn } as jwt.SignOptions
  );

  (user as { password?: string }).password = undefined;

  res.cookie("token", token, COOKIE_OPTIONS);
  sendSuccess(res, 200, { user }, MESSAGES.AUTH.LOGIN_SUCCESS);
});

export const logout = catchAsync(async (_req: Request, res: Response) => {
  res.cookie("token", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    // secure: env.nodeEnv === "production",
    secure: false, // false because on vps dont have domain name, only ip address, later when buy domain name, can change this
  });
  sendSuccess(res, 200, undefined, "Đã đăng xuất");
});

export const me = catchAsync(async (req: Request, res: Response) => {
  if (!req.userDoc) {
    throw unauthorized(MESSAGES.AUTH.TOKEN_INVALID);
  }
  sendSuccess(res, 200, { user: req.userDoc });
});
