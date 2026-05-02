import { Telegraf, Context, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { env } from "../config/index.js";
import { User, BackupRequest } from "../models/index.js";
import { formatDate } from "../utils/index.js";
import { runBackupForRequest } from "./backupService.js";
import type { RequestHandler } from "express";

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

const MESSAGES = {
  START_HEADER: "Todo App Bot\n\nCommands:\n",
  HELP_HEADER: "Help:\n\n",
  COMMAND_LIST:
    "/register <username> <password> - Create a new user\n" +
    "/remove <username> - Remove a user\n" +
    "/list - Show user list\n" +
    "/backup - Back up MongoDB now",
  REGISTER_USAGE: "Usage: /register <username> <password>",
  USERNAME_LENGTH: "Username must be 3-30 characters.",
  USERNAME_CHARS: "Username may only contain letters, digits, and underscores.",
  PASSWORD_LENGTH: "Password must be at least 6 characters.",
  USERNAME_EXISTS: (name: string) => `Username "${name}" already exists.`,
  REGISTER_SUCCESS: (name: string, pass: string, dateStr: string) =>
    `User created successfully!\n\nUsername: ${name}\nPassword: ${pass}\nCreated at: ${dateStr}`,
  REGISTER_ERROR: "An error occurred while creating the user.",
  REMOVE_USAGE: "Usage: /remove <username>",
  USER_NOT_FOUND: (name: string) => `User "${name}" not found.`,
  REMOVE_SUCCESS: (name: string) => `User "${name}" removed successfully.`,
  REMOVE_ERROR: "An error occurred while removing the user.",
  NO_USERS: "No users yet.",
  USER_LIST_HEADER: (count: number) => `User list (${count}):\n\n`,
  NEVER_LOGGED_IN: "Never logged in",
  LOGIN_LABEL: "Last login",
  LIST_ERROR: "An error occurred while fetching the user list.",
  NO_PERMISSION: "You do not have permission to use this bot.",
  BACKUP_PROMPT: (dateStr: string) =>
    `It's the 1st of ${dateStr}. Do you want to back up MongoDB now?`,
  BACKUP_BTN_YES: "Yes, back up now",
  BACKUP_BTN_NO: "No, skip",
  BACKUP_NOT_FOUND: "Backup request not found or has expired.",
  BACKUP_ALREADY_PROCESSING: "Backup already in progress, please wait...",
  BACKUP_DENIED: "Backup skipped for this month.",
  BACKUP_STARTED: "Starting database dump, file will arrive when ready...",
  BACKUP_SUCCESS: (sizeMb: string) =>
    `Backup successful! File size: ${sizeMb} MB`,
  BACKUP_FAILED: (msg: string) => `Backup failed: ${msg}`,
  BACKUP_NOT_CONFIGURED: "Telegram bot is not configured.",
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
      ctx.reply(MESSAGES.NO_PERMISSION);
      return false;
    }
    return true;
  }

  private handleStart(ctx: Context): void {
    if (!this.requireAdmin(ctx)) return;
    ctx.reply(MESSAGES.START_HEADER + MESSAGES.COMMAND_LIST);
  }

  private handleHelp(ctx: Context): void {
    if (!this.requireAdmin(ctx)) return;
    ctx.reply(MESSAGES.HELP_HEADER + MESSAGES.COMMAND_LIST);
  }

  private async handleRegister(ctx: Context & { message: { text: string } }): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    try {
      const text = ctx.message.text;
      const args = text.split(" ").slice(1);
      if (args.length < 2) {
        ctx.reply(MESSAGES.REGISTER_USAGE);
        return;
      }
      const [username, password] = args;
      if (username.length < 3 || username.length > 30) {
        ctx.reply(MESSAGES.USERNAME_LENGTH);
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        ctx.reply(MESSAGES.USERNAME_CHARS);
        return;
      }
      if (password.length < 6) {
        ctx.reply(MESSAGES.PASSWORD_LENGTH);
        return;
      }
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        ctx.reply(MESSAGES.USERNAME_EXISTS(username));
        return;
      }
      const newUser = new User({
        username,
        password,
        displayName: username,
      });
      await newUser.save();
      ctx.reply(MESSAGES.REGISTER_SUCCESS(username, password, formatDate(new Date())));
    } catch (error) {
      console.error("Error registering user:", error);
      ctx.reply(MESSAGES.REGISTER_ERROR);
    }
  }

  private async handleRemove(ctx: Context & { message: { text: string } }): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    try {
      const args = ctx.message.text.split(" ").slice(1);
      if (args.length < 1) {
        ctx.reply(MESSAGES.REMOVE_USAGE);
        return;
      }
      const [username] = args;
      const user = await User.findByUsername(username);
      if (!user) {
        ctx.reply(MESSAGES.USER_NOT_FOUND(username));
        return;
      }
      await User.findByIdAndDelete(user._id);
      ctx.reply(MESSAGES.REMOVE_SUCCESS(username));
    } catch (error) {
      console.error("Error removing user:", error);
      ctx.reply(MESSAGES.REMOVE_ERROR);
    }
  }

  private async handleList(ctx: Context): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    try {
      const users = await User.find({ isActive: true }).sort({
        createdAt: -1,
      });
      if (users.length === 0) {
        ctx.reply(MESSAGES.NO_USERS);
        return;
      }
      const userList = users
        .map((user, index) => {
          const lastLogin = user.lastLogin
            ? formatDate(user.lastLogin)
            : MESSAGES.NEVER_LOGGED_IN;
          return `${index + 1}. ${user.username} (${user.displayName})\n   -> ${MESSAGES.LOGIN_LABEL}: ${lastLogin}`;
        })
        .join("\n\n");
      ctx.reply(MESSAGES.USER_LIST_HEADER(users.length) + userList);
    } catch (error) {
      console.error("Error listing users:", error);
      ctx.reply(MESSAGES.LIST_ERROR);
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
    const monthName = today.toLocaleString("en-US", { month: "long" });
    const dateStr = `${monthName} ${today.getFullYear()}`;
    await this.bot.telegram.sendMessage(
      this.adminChatId,
      MESSAGES.BACKUP_PROMPT(dateStr),
      Markup.inlineKeyboard([
        Markup.button.callback(
          MESSAGES.BACKUP_BTN_YES,
          `backup:yes:${requestId}`
        ),
        Markup.button.callback(
          MESSAGES.BACKUP_BTN_NO,
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
      await ctx.editMessageText(MESSAGES.BACKUP_NOT_FOUND);
      return;
    }
    if (request.status !== "pending") {
      await ctx.editMessageText(MESSAGES.BACKUP_ALREADY_PROCESSING);
      return;
    }

    request.status = "approved";
    await request.save();

    await ctx.editMessageText(MESSAGES.BACKUP_STARTED);

    try {
      const result = await runBackupForRequest(
        requestId,
        this.bot.telegram,
        this.adminChatId
      );
      await ctx.telegram.sendMessage(
        this.adminChatId,
        MESSAGES.BACKUP_SUCCESS((result.fileSize / 1024 / 1024).toFixed(2))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      await ctx.telegram.sendMessage(
        this.adminChatId,
        MESSAGES.BACKUP_FAILED(msg)
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
    await ctx.editMessageText(MESSAGES.BACKUP_DENIED);
  }

  private async handleBackupCommand(ctx: Context): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    if (!this.bot || !this.adminChatId) {
      ctx.reply(MESSAGES.BACKUP_NOT_CONFIGURED);
      return;
    }
    const request = await BackupRequest.create({ status: "approved" });
    await ctx.reply(MESSAGES.BACKUP_STARTED);
    try {
      const result = await runBackupForRequest(
        request.id,
        this.bot.telegram,
        this.adminChatId
      );
      await ctx.reply(
        MESSAGES.BACKUP_SUCCESS((result.fileSize / 1024 / 1024).toFixed(2))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      await ctx.reply(MESSAGES.BACKUP_FAILED(msg));
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
