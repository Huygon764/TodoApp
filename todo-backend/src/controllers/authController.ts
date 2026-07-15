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
import {
  verifyGoogleToken,
  findOrCreateGoogleUser,
} from "../services/googleAuth.js";
import { notifyPendingSignup } from "../services/pendingApproval.js";
import type {
  IUserDocument,
  IInviteCodeDocument,
  InviteKind,
} from "../types/index.js";

const INVITE_REASON_MESSAGE: Record<InviteInvalidReason, string> = {
  not_found: MESSAGES.INVITE.NOT_FOUND,
  expired: MESSAGES.INVITE.EXPIRED,
  used: MESSAGES.INVITE.USED,
  revoked: MESSAGES.INVITE.REVOKED,
};

/**
 * Shared non-consuming code check for the register/reset pages.
 * Returns { valid:true, ...extra } only when the code is valid AND of
 * the expected kind; otherwise { valid:false, reason }.
 */
async function respondCodeCheck(
  req: Request,
  res: Response,
  expectedKind: InviteKind,
  buildExtra: (invite: IInviteCodeDocument) => Record<string, unknown>
): Promise<void> {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!code) {
    sendSuccess(res, 200, { valid: false, reason: "not_found" });
    return;
  }
  const result = await validateInviteCode(code);
  if (result.valid && (result.invite.kind ?? "signup") === expectedKind) {
    sendSuccess(res, 200, {
      valid: true,
      ...buildExtra(result.invite),
    });
    return;
  }
  const reason = result.valid ? "not_found" : result.reason;
  sendSuccess(res, 200, { valid: false, reason });
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  sameSite: "lax" as const,
  // Production runs behind HTTPS (NODE_ENV=production is set in the Dockerfile),
  // so the cookie is secure there; local dev stays on http.
  secure: env.nodeEnv === "production",
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

export const googleLogin = catchAsync(async (req: Request, res: Response) => {
  const { idToken, timezone } = req.body as {
    idToken?: string;
    timezone?: string;
  };
  if (!idToken) throw badRequest("idToken is required");

  let profile;
  try {
    profile = await verifyGoogleToken(idToken);
  } catch {
    throw unauthorized("Google sign-in failed");
  }
  if (!profile.emailVerified) throw unauthorized("Google email not verified");

  const tz =
    typeof timezone === "string" && timezone.trim() && isValidTimezone(timezone.trim())
      ? timezone.trim()
      : undefined;

  const { user, created } = await findOrCreateGoogleUser(profile, tz);

  // Ping the admin the first time this account is seen.
  if (created) await notifyPendingSignup(user);

  if (!user.isActive) {
    return sendSuccess(res, 200, { pending: true });
  }

  if (tz) user.timezone = tz;
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
export const checkInvite = catchAsync((req: Request, res: Response) =>
  respondCodeCheck(req, res, "signup", (invite) => ({ name: invite.name }))
);

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
  if ((check.invite.kind ?? "signup") !== "signup") {
    throw badRequest(MESSAGES.INVITE.NOT_FOUND);
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

/**
 * GET /api/auth/reset/check?code=...
 * Non-consuming validity check for a password-reset code.
 */
export const checkReset = catchAsync((req: Request, res: Response) =>
  respondCodeCheck(req, res, "reset", (invite) => ({
    username: invite.targetUsername,
  }))
);

/**
 * POST /api/auth/reset
 * Resets the target user's password using a reset code, then logs
 * them in. The code is consumed only on success (released otherwise).
 */
export const resetPassword = catchAsync(
  async (req: Request, res: Response) => {
    const { code, password } = req.body as {
      code?: string;
      password?: string;
    };

    if (!code || !password) {
      throw badRequest(MESSAGES.AUTH.CREDENTIALS_REQUIRED);
    }

    const check = await validateInviteCode(code);
    if (!check.valid) {
      throw badRequest(INVITE_REASON_MESSAGE[check.reason]);
    }
    if (check.invite.kind !== "reset" || !check.invite.targetUsername) {
      throw badRequest(MESSAGES.INVITE.NOT_FOUND);
    }

    const targetUsername = check.invite.targetUsername;

    const consumed = await consumeInviteCode(code, targetUsername);
    if (!consumed) {
      throw badRequest(MESSAGES.INVITE.USED);
    }

    const user = await User.findByUsername(targetUsername);
    if (!user) {
      // Target user was removed after the link was created
      await releaseInviteCode(code);
      throw badRequest(MESSAGES.USER.NOT_FOUND);
    }

    try {
      user.password = password;
      await user.save();
    } catch (e) {
      await releaseInviteCode(code);
      throw e;
    }

    await user.updateLastLogin();
    (user as { password?: string }).password = undefined;

    issueAuthCookie(res, user);
    sendSuccess(res, 200, { user }, MESSAGES.AUTH.RESET_SUCCESS);
  }
);
