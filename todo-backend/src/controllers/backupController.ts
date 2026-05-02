import type { Request, Response } from "express";
import { BackupRequest } from "../models/index.js";
import { telegramBot } from "../services/telegramBot.js";
import { sendError, sendSuccess } from "../utils/index.js";

const PENDING_EXPIRY_DAYS = 7;

export const triggerBackupPrompt = async (_req: Request, res: Response) => {
  try {
    const expiryDate = new Date(
      Date.now() - PENDING_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );
    await BackupRequest.updateMany(
      { status: "pending", triggeredAt: { $lt: expiryDate } },
      { $set: { status: "expired" } }
    );

    const request = await BackupRequest.create({ status: "pending" });

    await telegramBot.sendBackupPrompt(request.id);

    sendSuccess(res, 200, { requestId: request.id });
  } catch (err) {
    console.error("[backup] triggerBackupPrompt error:", err);
    sendError(res, 500, "Failed to trigger backup prompt");
  }
};
