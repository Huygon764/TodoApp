import crypto from "crypto";
import { InviteCode } from "../models/index.js";
import type { IInviteCodeDocument } from "../types/index.js";

/** Invite codes are valid for 24 hours and single-use */
export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export type InviteInvalidReason =
  | "not_found"
  | "expired"
  | "used"
  | "revoked";

export type InviteValidation =
  | { valid: true; invite: IInviteCodeDocument }
  | { valid: false; reason: InviteInvalidReason };

/** 32-char url-safe random string (~190 bits of entropy) */
export function generateInviteCode(): string {
  return crypto.randomBytes(24).toString("base64url").slice(0, 32);
}

export async function createInvite(
  name: string
): Promise<IInviteCodeDocument> {
  const invite = new InviteCode({
    code: generateInviteCode(),
    name: name.trim(),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });
  await invite.save();
  return invite;
}

/** Read-only validity check (does not consume the code) */
export async function validateInviteCode(
  code: string
): Promise<InviteValidation> {
  const invite = await InviteCode.findOne({ code });
  if (!invite) return { valid: false, reason: "not_found" };
  if (invite.revokedAt) return { valid: false, reason: "revoked" };
  if (invite.usedAt) return { valid: false, reason: "used" };
  if (invite.expiresAt.getTime() <= Date.now()) {
    return { valid: false, reason: "expired" };
  }
  return { valid: true, invite };
}

/**
 * Atomically consume a code. Only one concurrent caller can win; the
 * condition guarantees the code is still pending, not revoked, not expired.
 * Returns the updated doc, or null if it could not be consumed.
 */
export async function consumeInviteCode(
  code: string,
  username: string
): Promise<IInviteCodeDocument | null> {
  return InviteCode.findOneAndUpdate(
    {
      code,
      usedAt: null,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { usedAt: new Date(), usedByUsername: username } },
    { new: true }
  );
}

/** Roll back a consumed code so the invite is not wasted on a failed signup */
export async function releaseInviteCode(code: string): Promise<void> {
  await InviteCode.updateOne(
    { code },
    { $set: { usedAt: null, usedByUsername: null } }
  );
}

/**
 * Revoke a pending code. Returns the outcome so the bot can give a
 * precise message.
 */
export async function revokeInviteCode(
  code: string
): Promise<"revoked" | "not_found" | "already_used" | "already_revoked"> {
  const invite = await InviteCode.findOne({ code });
  if (!invite) return "not_found";
  if (invite.usedAt) return "already_used";
  if (invite.revokedAt) return "already_revoked";
  invite.revokedAt = new Date();
  await invite.save();
  return "revoked";
}

/** Most recent invites for the admin listing */
export async function listInvites(
  limit = 20
): Promise<IInviteCodeDocument[]> {
  return InviteCode.find().sort({ createdAt: -1 }).limit(limit);
}

export function inviteStatus(
  invite: IInviteCodeDocument
): "used" | "revoked" | "expired" | "pending" {
  if (invite.revokedAt) return "revoked";
  if (invite.usedAt) return "used";
  if (invite.expiresAt.getTime() <= Date.now()) return "expired";
  return "pending";
}
