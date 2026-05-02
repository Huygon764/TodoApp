import { Telegraf, Context, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { env } from "../config/index.js";
import { User, BackupRequest } from "../models/index.js";
import { formatDateVi } from "../utils/index.js";
import { runBackupForRequest } from "./backupService.js";
import type { RequestHandler } from "express";

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

const MESSAGES_VI = {
  START_HEADER: "Todo App Bot\n\nCommands:\n",
  HELP_HEADER: "Huong dan:\n\n",
  COMMAND_LIST:
    "/register <username> <password> - Tao user moi\n" +
    "/remove <username> - Xoa user\n" +
    "/list - Xem danh sach users\n" +
    "/backup - Backup MongoDB ngay",
  REGISTER_USAGE: "Su dung: /register <username> <password>",
  USERNAME_LENGTH: "Username phai tu 3-30 ky tu.",
  USERNAME_CHARS: "Username chi duoc chua chu cai, so va dau gach duoi.",
  PASSWORD_LENGTH: "Password phai it nhat 6 ky tu.",
  USERNAME_EXISTS: (name: string) => `Username "${name}" da ton tai.`,
  REGISTER_SUCCESS: (name: string, pass: string, dateStr: string) =>
    `Tao user thanh cong!\n\nUsername: ${name}\nPassword: ${pass}\nNgay tao: ${dateStr}`,
  REGISTER_ERROR: "Co loi xay ra khi tao user.",
  REMOVE_USAGE: "Su dung: /remove <username>",
  USER_NOT_FOUND: (name: string) => `Khong tim thay user "${name}".`,
  REMOVE_SUCCESS: (name: string) => `Da xoa user "${name}" thanh cong!`,
  REMOVE_ERROR: "Co loi xay ra khi xoa user.",
  NO_USERS: "Chua co user nao.",
  USER_LIST_HEADER: (count: number) => `Danh sach users (${count}):\n\n`,
  NEVER_LOGGED_IN: "Chua dang nhap",
  LOGIN_LABEL: "Dang nhap",
  LIST_ERROR: "Co loi xay ra khi lay danh sach users.",
  NO_PERMISSION: "You do not have permission to use this bot.",
  BACKUP_PROMPT: (dateStr: string) =>
    `Mung 1 thang ${dateStr} roi! Backup MongoDB ngay khong?`,
  BACKUP_BTN_YES: "Yes, backup ngay",
  BACKUP_BTN_NO: "Khong, bo qua",
  BACKUP_NOT_FOUND: "Backup request khong ton tai hoac da het han.",
  BACKUP_ALREADY_PROCESSING: "Backup dang chay, vui long doi...",
  BACKUP_DENIED: "Da bo qua backup thang nay.",
  BACKUP_STARTED: "Bat dau dump database, se gui file khi xong...",
  BACKUP_SUCCESS: (sizeMb: string) =>
    `Backup thanh cong! File size: ${sizeMb} MB`,
  BACKUP_FAILED: (msg: string) => `Backup that bai: ${msg}`,
  BACKUP_NOT_CONFIGURED: "Telegram bot chua duoc cau hinh.",
} as const;

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

  private requireAdmin(ctx: Context): boolean {
    if (!this.isAdmin(ctx)) {
      ctx.reply(MESSAGES_VI.NO_PERMISSION);
      return false;
    }
    return true;
  }

  private handleStart(ctx: Context): void {
    if (!this.requireAdmin(ctx)) return;
    ctx.reply(MESSAGES_VI.START_HEADER + MESSAGES_VI.COMMAND_LIST);
  }

  private handleHelp(ctx: Context): void {
    if (!this.requireAdmin(ctx)) return;
    ctx.reply(MESSAGES_VI.HELP_HEADER + MESSAGES_VI.COMMAND_LIST);
  }

  private async handleRegister(ctx: Context & { message: { text: string } }): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    try {
      const text = ctx.message.text;
      const args = text.split(" ").slice(1);
      if (args.length < 2) {
        ctx.reply(MESSAGES_VI.REGISTER_USAGE);
        return;
      }
      const [username, password] = args;
      if (username.length < 3 || username.length > 30) {
        ctx.reply(MESSAGES_VI.USERNAME_LENGTH);
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        ctx.reply(MESSAGES_VI.USERNAME_CHARS);
        return;
      }
      if (password.length < 6) {
        ctx.reply(MESSAGES_VI.PASSWORD_LENGTH);
        return;
      }
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        ctx.reply(MESSAGES_VI.USERNAME_EXISTS(username));
        return;
      }
      const newUser = new User({
        username,
        password,
        displayName: username,
      });
      await newUser.save();
      ctx.reply(MESSAGES_VI.REGISTER_SUCCESS(username, password, formatDateVi(new Date())));
    } catch (error) {
      console.error("Error registering user:", error);
      ctx.reply(MESSAGES_VI.REGISTER_ERROR);
    }
  }

  private async handleRemove(ctx: Context & { message: { text: string } }): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    try {
      const args = ctx.message.text.split(" ").slice(1);
      if (args.length < 1) {
        ctx.reply(MESSAGES_VI.REMOVE_USAGE);
        return;
      }
      const [username] = args;
      const user = await User.findByUsername(username);
      if (!user) {
        ctx.reply(MESSAGES_VI.USER_NOT_FOUND(username));
        return;
      }
      await User.findByIdAndDelete(user._id);
      ctx.reply(MESSAGES_VI.REMOVE_SUCCESS(username));
    } catch (error) {
      console.error("Error removing user:", error);
      ctx.reply(MESSAGES_VI.REMOVE_ERROR);
    }
  }

  private async handleList(ctx: Context): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    try {
      const users = await User.find({ isActive: true }).sort({
        createdAt: -1,
      });
      if (users.length === 0) {
        ctx.reply(MESSAGES_VI.NO_USERS);
        return;
      }
      const userList = users
        .map((user, index) => {
          const lastLogin = user.lastLogin
            ? formatDateVi(user.lastLogin)
            : MESSAGES_VI.NEVER_LOGGED_IN;
          return `${index + 1}. ${user.username} (${user.displayName})\n   -> ${MESSAGES_VI.LOGIN_LABEL}: ${lastLogin}`;
        })
        .join("\n\n");
      ctx.reply(MESSAGES_VI.USER_LIST_HEADER(users.length) + userList);
    } catch (error) {
      console.error("Error listing users:", error);
      ctx.reply(MESSAGES_VI.LIST_ERROR);
    }
  }

  private setupCommands(): void {
    if (!this.bot) return;

    this.bot.start((ctx) => this.handleStart(ctx));
    this.bot.help((ctx) => this.handleHelp(ctx));
    this.bot.command("register", (ctx) => this.handleRegister(ctx));
    this.bot.command("remove", (ctx) => this.handleRemove(ctx));
    this.bot.command("list", (ctx) => this.handleList(ctx));
    this.bot.command("backup", (ctx) => this.handleBackupCommand(ctx));
    this.bot.action(/^backup:yes:([a-f0-9]+)$/i, (ctx) =>
      this.handleBackupYes(ctx)
    );
    this.bot.action(/^backup:no:([a-f0-9]+)$/i, (ctx) =>
      this.handleBackupNo(ctx)
    );

    this.bot.on(message("text"), (ctx) => {
      if (!this.requireAdmin(ctx)) return;
    });
  }

  async sendBackupPrompt(requestId: string): Promise<void> {
    if (!this.bot || !this.adminChatId) {
      console.warn("[backup] bot not configured, cannot send backup prompt");
      return;
    }
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getFullYear()}`;
    await this.bot.telegram.sendMessage(
      this.adminChatId,
      MESSAGES_VI.BACKUP_PROMPT(dateStr),
      Markup.inlineKeyboard([
        Markup.button.callback(
          MESSAGES_VI.BACKUP_BTN_YES,
          `backup:yes:${requestId}`
        ),
        Markup.button.callback(
          MESSAGES_VI.BACKUP_BTN_NO,
          `backup:no:${requestId}`
        ),
      ])
    );
  }

  private async handleBackupYes(ctx: Context): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    await ctx.answerCbQuery();

    const data = (ctx.callbackQuery as { data?: string })?.data;
    const match = data?.match(/^backup:yes:([a-f0-9]+)$/i);
    const requestId = match?.[1];
    if (!requestId || !this.bot || !this.adminChatId) return;

    const request = await BackupRequest.findById(requestId);
    if (!request) {
      await ctx.editMessageText(MESSAGES_VI.BACKUP_NOT_FOUND);
      return;
    }
    if (request.status !== "pending") {
      await ctx.editMessageText(MESSAGES_VI.BACKUP_ALREADY_PROCESSING);
      return;
    }

    request.status = "approved";
    await request.save();

    await ctx.editMessageText(MESSAGES_VI.BACKUP_STARTED);

    try {
      const result = await runBackupForRequest(
        requestId,
        this.bot.telegram,
        this.adminChatId
      );
      await ctx.telegram.sendMessage(
        this.adminChatId,
        MESSAGES_VI.BACKUP_SUCCESS((result.fileSize / 1024 / 1024).toFixed(2))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      await ctx.telegram.sendMessage(
        this.adminChatId,
        MESSAGES_VI.BACKUP_FAILED(msg)
      );
    }
  }

  private async handleBackupNo(ctx: Context): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    await ctx.answerCbQuery();

    const data = (ctx.callbackQuery as { data?: string })?.data;
    const match = data?.match(/^backup:no:([a-f0-9]+)$/i);
    const requestId = match?.[1];
    if (!requestId) return;

    await BackupRequest.findByIdAndUpdate(requestId, { status: "denied" });
    await ctx.editMessageText(MESSAGES_VI.BACKUP_DENIED);
  }

  private async handleBackupCommand(ctx: Context): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    if (!this.bot || !this.adminChatId) {
      ctx.reply(MESSAGES_VI.BACKUP_NOT_CONFIGURED);
      return;
    }
    const request = await BackupRequest.create({ status: "approved" });
    await ctx.reply(MESSAGES_VI.BACKUP_STARTED);
    try {
      const result = await runBackupForRequest(
        request.id,
        this.bot.telegram,
        this.adminChatId
      );
      await ctx.reply(
        MESSAGES_VI.BACKUP_SUCCESS((result.fileSize / 1024 / 1024).toFixed(2))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      await ctx.reply(MESSAGES_VI.BACKUP_FAILED(msg));
    }
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
      console.log("Telegram bot not configured. Skipping...");
      return;
    }
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (env.telegramWebhookDomain) {
          const webhookUrl = `${env.telegramWebhookDomain}/webhook/telegram`;
          await this.bot.telegram.setWebhook(webhookUrl);
          console.log(`Telegram bot started (webhook: ${webhookUrl})`);
        } else {
          await this.bot.launch();
          console.log("Telegram bot started (polling)");
        }
        process.once("SIGINT", () => this.bot?.stop("SIGINT"));
        process.once("SIGTERM", () => this.bot?.stop("SIGTERM"));
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown";
        console.error(
          `Telegram bot launch attempt ${attempt}/${MAX_RETRIES} failed:`,
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
