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
import {
  validateInviteCode,
  consumeInviteCode,
  releaseInviteCode,
  type InviteInvalidReason,
} from "../services/inviteService.js";
import type { IUserDocument } from "../types/index.js";

const INVITE_REASON_MESSAGE: Record<InviteInvalidReason, string> = {
  not_found: MESSAGES.INVITE.NOT_FOUND,
  expired: MESSAGES.INVITE.EXPIRED,
  used: MESSAGES.INVITE.USED,
  revoked: MESSAGES.INVITE.REVOKED,
};

const COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  sameSite: "lax" as const,
  // secure: env.nodeEnv === "production",
  secure: false, // false because on vps dont have domain name, only ip address, later when buy domain name, can change this
  path: "/",
};

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Sign a JWT for the user and attach it as the auth cookie */
function issueAuthCookie(res: Response, user: IUserDocument): void {
  const token = jwt.sign(
    { userId: user._id.toString(), username: user.username },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn } as jwt.SignOptions
  );
  res.cookie("token", token, COOKIE_OPTIONS);
}

export const login = catchAsync(async (req: Request, res: Response) => {
  const { username, password, timezone } = req.body as {
    username?: string;
    password?: string;
    timezone?: string;
  };

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

  if (typeof timezone === "string" && timezone.trim() && isValidTimezone(timezone.trim())) {
    user.timezone = timezone.trim();
  }

  await user.updateLastLogin();

  (user as { password?: string }).password = undefined;

  issueAuthCookie(res, user);
  sendSuccess(res, 200, { user }, MESSAGES.AUTH.LOGIN_SUCCESS);
});

export const logout = catchAsync(async (_req: Request, res: Response) => {
  res.cookie("token", "", { ...COOKIE_OPTIONS, maxAge: 0 });
  sendSuccess(res, 200, undefined, "Đã đăng xuất");
});

export const me = catchAsync(async (req: Request, res: Response) => {
  if (!req.userDoc) {
    throw unauthorized(MESSAGES.AUTH.TOKEN_INVALID);
  }
  sendSuccess(res, 200, { user: req.userDoc });
});

/**
 * GET /api/auth/register/check?code=...
 * Lightweight, non-consuming validity check so the register page can
 * show an error instead of a form when the invite is bad.
 */
export const checkInvite = catchAsync(async (req: Request, res: Response) => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!code) {
    return sendSuccess(res, 200, { valid: false, reason: "not_found" });
  }
  const result = await validateInviteCode(code);
  if (result.valid) {
    return sendSuccess(res, 200, { valid: true, name: result.invite.name });
  }
  sendSuccess(res, 200, { valid: false, reason: result.reason });
});

/**
 * POST /api/auth/register
 * Invite-gated signup. The invite code is consumed only when the
 * account is actually created (released on failure).
 */
export const register = catchAsync(async (req: Request, res: Response) => {
  const { code, username, password, timezone } = req.body as {
    code?: string;
    username?: string;
    password?: string;
    timezone?: string;
  };

  if (!code || !username || !password) {
    throw badRequest(MESSAGES.AUTH.CREDENTIALS_REQUIRED);
  }

  // Pre-check for a precise error message before consuming anything
  const check = await validateInviteCode(code);
  if (!check.valid) {
    throw badRequest(INVITE_REASON_MESSAGE[check.reason]);
  }

  const existingUser = await User.findByUsername(username);
  if (existingUser) {
    throw badRequest(MESSAGES.USER.USERNAME_EXISTS);
  }

  // Atomically consume; loser of a race gets a clear "already used"
  const consumed = await consumeInviteCode(code, username);
  if (!consumed) {
    throw badRequest(MESSAGES.INVITE.USED);
  }

  let user: IUserDocument;
  try {
    user = new User({ username, password, displayName: username });
    if (
      typeof timezone === "string" &&
      timezone.trim() &&
      isValidTimezone(timezone.trim())
    ) {
      user.timezone = timezone.trim();
    }
    await user.save();
  } catch {
    // User creation failed (e.g. duplicate username via race) - do not
    // waste the invite, let it be reused
    await releaseInviteCode(code);
    throw badRequest(MESSAGES.USER.USERNAME_EXISTS);
  }

  await user.updateLastLogin();
  (user as { password?: string }).password = undefined;

  issueAuthCookie(res, user);
  sendSuccess(res, 201, { user }, MESSAGES.AUTH.REGISTER_SUCCESS);
});
