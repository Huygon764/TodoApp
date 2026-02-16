import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { env, connectDb } from "./config/index.js";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { sendError } from "./utils/index.js";
import { telegramBot } from "./services/telegramBot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

connectDb();

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);

app.use(cookieParser());

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Telegram webhook must receive raw body - mount before body parsing is already done; Telegraf works with parsed body for webhook too in many setups. Keep webhook after json/urlencoded so Telegram can send updates.
app.use("/webhook/telegram", telegramBot.webhookCallback());

if (env.nodeEnv === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

app.use("/api", apiRoutes);

// Serve static frontend in production (Docker copies frontend build to public)
const staticPath = path.join(__dirname, "..", "public");
app.use(express.static(staticPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(staticPath, "index.html"), (err) => {
    if (err) next();
  });
});

app.use((_req, res) => {
  sendError(res, 404, "Endpoint không tồn tại");
});

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`🚀 Todo API running on http://localhost:${env.port}`);
  telegramBot.launch();
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down.");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down.");
  process.exit(0);
});

export default app;
