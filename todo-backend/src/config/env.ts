import dotenv from "dotenv";

dotenv.config();

interface Env {
  port: number;
  nodeEnv: "development" | "production" | "test";
  mongodbUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  frontendUrl: string;
  bcryptRounds: number;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  telegramWebhookDomain: string | null;
  geminiApiKey: string | null;
  cronSecret: string | null;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string): string | null {
  return process.env[key] || null;
}

const nodeEnv: Env["nodeEnv"] =
  (process.env.NODE_ENV as Env["nodeEnv"]) || "development";

/**
 * Required in production, falls back to a dev default otherwise.
 * Prevents silent misconfiguration (e.g. invite links pointing at
 * localhost because FRONTEND_URL was never set on the server).
 */
function requireInProd(key: string, devDefault: string): string {
  const value = process.env[key];
  if (value) return value;
  if (nodeEnv === "production") {
    throw new Error(
      `Missing required environment variable in production: ${key}`
    );
  }
  return devDefault;
}

export const env: Env = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv,
  mongodbUri: requireEnv("MONGODB_URI"),
  jwtSecret: requireEnv("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  frontendUrl: requireInProd("FRONTEND_URL", "http://localhost:5173"),
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
  telegramBotToken: optionalEnv("TELEGRAM_BOT_TOKEN"),
  telegramChatId: optionalEnv("TELEGRAM_CHAT_ID"),
  telegramWebhookDomain: optionalEnv("TELEGRAM_WEBHOOK_DOMAIN"),
  geminiApiKey: optionalEnv("GEMINI_API_KEY"),
  cronSecret: optionalEnv("CRON_SECRET"),
};

if (!env.cronSecret) {
  console.warn(
    "[env] CRON_SECRET not set - /api/internal/cron/* will reject all requests"
  );
}
