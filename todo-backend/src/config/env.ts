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

export const env: Env = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: (process.env.NODE_ENV as Env["nodeEnv"]) || "development",
  mongodbUri: requireEnv("MONGODB_URI"),
  jwtSecret: requireEnv("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
  telegramBotToken: optionalEnv("TELEGRAM_BOT_TOKEN"),
  telegramChatId: optionalEnv("TELEGRAM_CHAT_ID"),
  telegramWebhookDomain: optionalEnv("TELEGRAM_WEBHOOK_DOMAIN"),
  geminiApiKey: optionalEnv("GEMINI_API_KEY"),
};
