import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import { env } from "../config/index.js";
import { User } from "../models/index.js";
import { formatDateVi } from "../utils/index.js";
import type { RequestHandler } from "express";

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

class TelegramBot {
  private bot: Telegraf | null = null;
  private adminChatId: string | null;

  constructor() {
    this.adminChatId = env.telegramChatId;
    if (env.telegramBotToken) {
      this.bot = new Telegraf(env.telegramBotToken);
      this.setupCommands();
    }
  }

  private isAdmin(ctx: Context): boolean {
    const chatId = ctx.chat?.id?.toString();
    return chatId === this.adminChatId;
  }

  private setupCommands(): void {
    if (!this.bot) return;

    this.bot.start((ctx) => {
      if (!this.isAdmin(ctx)) {
        return ctx.reply("⛔ Bạn không có quyền sử dụng bot này.");
      }
      return ctx.reply(
        "📋 Todo App Bot\n\n" +
          "Commands:\n" +
          "/register <username> <password> - Tạo user mới\n" +
          "/remove <username> - Xóa user\n" +
          "/list - Xem danh sách users"
      );
    });

    this.bot.help((ctx) => {
      if (!this.isAdmin(ctx)) {
        return ctx.reply("⛔ Bạn không có quyền sử dụng bot này.");
      }
      return ctx.reply(
        "📖 Hướng dẫn:\n\n" +
          "/register <username> <password> - Tạo user mới\n" +
          "/remove <username> - Xóa user\n" +
          "/list - Xem danh sách users"
      );
    });

    this.bot.command("register", async (ctx) => {
      if (!this.isAdmin(ctx)) {
        return ctx.reply("⛔ Bạn không có quyền sử dụng bot này.");
      }
      try {
        const text = ctx.message.text;
        const args = text.split(" ").slice(1);
        if (args.length < 2) {
          return ctx.reply("❌ Sử dụng: /register <username> <password>");
        }
        const [username, password] = args;
        if (username.length < 3 || username.length > 30) {
          return ctx.reply("❌ Username phải từ 3-30 ký tự.");
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          return ctx.reply(
            "❌ Username chỉ được chứa chữ cái, số và dấu gạch dưới."
          );
        }
        if (password.length < 6) {
          return ctx.reply("❌ Password phải ít nhất 6 ký tự.");
        }
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
          return ctx.reply(`❌ Username "${username}" đã tồn tại.`);
        }
        const newUser = new User({
          username,
          password,
          displayName: username,
        });
        await newUser.save();
        return ctx.reply(
          `✅ Tạo user thành công!\n\n` +
            `👤 Username: ${username}\n` +
            `🔑 Password: ${password}\n` +
            `📅 Ngày tạo: ${formatDateVi(new Date())}`
        );
      } catch (error) {
        console.error("Error registering user:", error);
        return ctx.reply("❌ Có lỗi xảy ra khi tạo user.");
      }
    });

    this.bot.command("remove", async (ctx) => {
      if (!this.isAdmin(ctx)) {
        return ctx.reply("⛔ Bạn không có quyền sử dụng bot này.");
      }
      try {
        const args = ctx.message.text.split(" ").slice(1);
        if (args.length < 1) {
          return ctx.reply("❌ Sử dụng: /remove <username>");
        }
        const [username] = args;
        const user = await User.findByUsername(username);
        if (!user) {
          return ctx.reply(`❌ Không tìm thấy user "${username}".`);
        }
        await User.findByIdAndDelete(user._id);
        return ctx.reply(`✅ Đã xóa user "${username}" thành công!`);
      } catch (error) {
        console.error("Error removing user:", error);
        return ctx.reply("❌ Có lỗi xảy ra khi xóa user.");
      }
    });

    this.bot.command("list", async (ctx) => {
      if (!this.isAdmin(ctx)) {
        return ctx.reply("⛔ Bạn không có quyền sử dụng bot này.");
      }
      try {
        const users = await User.find({ isActive: true }).sort({
          createdAt: -1,
        });
        if (users.length === 0) {
          return ctx.reply("📋 Chưa có user nào.");
        }
        const userList = users
          .map((user, index) => {
            const lastLogin = user.lastLogin
              ? formatDateVi(user.lastLogin)
              : "Chưa đăng nhập";
            return `${index + 1}. ${user.username} (${user.displayName})\n   └ Đăng nhập: ${lastLogin}`;
          })
          .join("\n\n");
        return ctx.reply(`📋 Danh sách users (${users.length}):\n\n${userList}`);
      } catch (error) {
        console.error("Error listing users:", error);
        return ctx.reply("❌ Có lỗi xảy ra khi lấy danh sách users.");
      }
    });

    this.bot.on(message("text"), (ctx) => {
      if (!this.isAdmin(ctx)) {
        return ctx.reply("⛔ Bạn không có quyền sử dụng bot này.");
      }
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  webhookCallback(): RequestHandler {
    if (!this.bot) {
      return (_req, res) => res.status(200).send("Bot not configured");
    }
    return this.bot.webhookCallback("/webhook/telegram") as RequestHandler;
  }

  async launch(): Promise<void> {
    if (!this.bot) {
      console.log("⚠️ Telegram bot not configured. Skipping...");
      return;
    }
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (env.telegramWebhookDomain) {
          const webhookUrl = `${env.telegramWebhookDomain}/webhook/telegram`;
          await this.bot.telegram.setWebhook(webhookUrl);
          console.log(`✅ Telegram bot started (webhook: ${webhookUrl})`);
        } else {
          await this.bot.launch();
          console.log("✅ Telegram bot started (polling)");
        }
        process.once("SIGINT", () => this.bot?.stop("SIGINT"));
        process.once("SIGTERM", () => this.bot?.stop("SIGTERM"));
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown";
        console.error(
          `❌ Telegram bot launch attempt ${attempt}/${MAX_RETRIES} failed:`,
          errorMessage
        );
        if (attempt < MAX_RETRIES) {
          await this.sleep(RETRY_DELAY);
        }
      }
    }
  }
}

export const telegramBot = new TelegramBot();
