import type { IUserDocument } from "../types/index.js";

/**
 * Decouples the auth controller from the Telegram bot: the bot registers a
 * notifier at startup, and the controller calls `notifyPendingSignup` when a
 * new Google user is created. Avoids a controller -> telegramBot import cycle.
 */
type Notifier = (user: IUserDocument) => Promise<void>;

let notifier: Notifier | null = null;

export function setPendingNotifier(fn: Notifier): void {
  notifier = fn;
}

export async function notifyPendingSignup(user: IUserDocument): Promise<void> {
  if (!notifier) return;
  try {
    await notifier(user);
  } catch {
    // Best-effort: never block sign-in on a Telegram failure.
  }
}
