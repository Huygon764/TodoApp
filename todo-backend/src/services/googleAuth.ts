import { OAuth2Client } from "google-auth-library";
import { User } from "../models/index.js";
import { env } from "../config/index.js";
import type { IUserDocument } from "../types/index.js";

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

const client = new OAuth2Client();

/** Verify a Google ID token and extract the profile. Throws on any failure. */
export async function verifyGoogleToken(idToken: string): Promise<GoogleProfile> {
  if (!env.googleClientId) throw new Error("GOOGLE_CLIENT_ID not configured");
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.googleClientId,
  });
  const p = ticket.getPayload();
  if (!p || !p.sub || !p.email) throw new Error("Invalid Google token");
  return {
    sub: p.sub,
    email: p.email,
    emailVerified: Boolean(p.email_verified),
    name: p.name || p.email.split("@")[0]!,
    picture: p.picture,
  };
}

/** Derive a unique username from an email local-part. `exists` reports taken names. */
export async function generateUsername(
  email: string,
  exists: (u: string) => Promise<boolean>,
): Promise<string> {
  const rawBase = (email.split("@")[0] || "user").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24);
  const base = rawBase.length < 3 ? `${rawBase || "user"}_u` : rawBase;
  if (!(await exists(base))) return base;
  for (let i = 0; i < 50; i++) {
    const suffix = ((i + 3) * 7).toString(36);
    const candidate = `${base.slice(0, 24)}_${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${base.slice(0, 20)}_${Date.now().toString(36).slice(-6)}`;
}

export async function findOrCreateGoogleUser(
  profile: GoogleProfile,
  timezone?: string,
): Promise<{ user: IUserDocument; created: boolean }> {
  const byGoogle = await User.findOne({ googleId: profile.sub });
  if (byGoogle) return { user: byGoogle, created: false };

  // Link a legacy/pre-seeded account that already carries this email.
  const byEmail = await User.findOne({ email: profile.email });
  if (byEmail) {
    byEmail.googleId = profile.sub;
    if (!byEmail.avatarUrl) byEmail.avatarUrl = profile.picture;
    await byEmail.save({ validateBeforeSave: false });
    return { user: byEmail, created: false };
  }

  const username = await generateUsername(
    profile.email,
    async (u) => (await User.countDocuments({ username: u })) > 0,
  );
  const created = await User.create({
    googleId: profile.sub,
    email: profile.email,
    displayName: profile.name,
    avatarUrl: profile.picture,
    username,
    isActive: false, // pending admin approval
    ...(timezone ? { timezone } : {}),
  });
  return { user: created, created: true };
}
