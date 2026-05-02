import { gzipSync } from "zlib";
import mongoose from "mongoose";
import type { Telegram } from "telegraf";
import { BackupRequest } from "../models/index.js";

const TELEGRAM_DOC_LIMIT_BYTES = 49 * 1024 * 1024;

interface BackupResult {
  fileSize: number;
  filesSent: number;
}

async function dumpAllCollections(): Promise<Record<string, unknown[]>> {
  const db = mongoose.connection.db;
  if (!db) throw new Error("DB connection not ready");

  const collections = await db.listCollections().toArray();
  const dump: Record<string, unknown[]> = {};

  for (const { name } of collections) {
    if (name.startsWith("system.")) continue;
    const docs = await db.collection(name).find({}).toArray();
    dump[name] = docs;
  }

  return dump;
}

function buildFilename(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `todo-app-backup-${yyyy}-${mm}-${dd}.json.gz`;
}

export async function runBackupForRequest(
  requestId: string,
  telegram: Telegram,
  chatId: string
): Promise<BackupResult> {
  await BackupRequest.findByIdAndUpdate(requestId, { status: "in-progress" });

  try {
    const dump = await dumpAllCollections();
    const json = JSON.stringify(dump);
    const gzBuffer = gzipSync(Buffer.from(json, "utf-8"));

    if (gzBuffer.byteLength > TELEGRAM_DOC_LIMIT_BYTES) {
      throw new Error(
        `Backup size ${(gzBuffer.byteLength / 1024 / 1024).toFixed(
          2
        )}MB exceeds Telegram 49MB limit. Consider splitting per collection or uploading to GCS.`
      );
    }

    const filename = buildFilename();
    await telegram.sendDocument(chatId, { source: gzBuffer, filename });

    await BackupRequest.findByIdAndUpdate(requestId, {
      status: "completed",
      fileSize: gzBuffer.byteLength,
      filesSent: 1,
    });

    return { fileSize: gzBuffer.byteLength, filesSent: 1 };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "unknown";
    await BackupRequest.findByIdAndUpdate(requestId, {
      status: "failed",
      errorMessage,
    });
    throw err;
  }
}
