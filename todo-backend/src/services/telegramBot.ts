import { Telegraf, Context, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { env } from "../config/index.js";
import { User, BackupRequest } from "../models/index.js";
import { formatDate } from "../utils/index.js";
import { runBackupForRequest } from "./backupService.js";
import {
  createInvite,
  createResetCode,
  listInvites,
  revokeInviteCode,
  inviteStatus,
} from "./inviteService.js";
import {
  TELEGRAM_MESSAGES as MESSAGES,
  TELEGRAM_BOT_COMMANDS,
} from "./telegram/messages.js";
import { setPendingNotifier } from "./pendingApproval.js";
import type { IUserDocument } from "../types/index.js";
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

  private async handleInvite(
    ctx: Context & { message: { text: string } }
  ): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    try {
      const name = ctx.message.text.split(" ").slice(1).join(" ").trim();
      if (!name) {
        ctx.reply(MESSAGES.INVITE_USAGE);
        return;
      }
      const invite = await createInvite(name);
      const link = `${env.frontendUrl}/register?code=${invite.code}`;
      ctx.reply(
        MESSAGES.INVITE_SUCCESS(
          invite.name,
          link,
          formatDate(invite.expiresAt)
        )
      );
    } catch (error) {
      console.error("Error creating invite:", error);
      ctx.reply(MESSAGES.INVITE_ERROR);
    }
  }

  private async handleResetLink(
    ctx: Context & { message: { text: string } }
  ): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    try {
      const username = ctx.message.text.split(" ").slice(1)[0]?.trim();
      if (!username) {
        ctx.reply(MESSAGES.RESETLINK_USAGE);
        return;
      }
      const user = await User.findByUsername(username);
      if (!user) {
        ctx.reply(MESSAGES.RESETLINK_USER_NOT_FOUND(username));
        return;
      }
      const invite = await createResetCode(username);
      const link = `${env.frontendUrl}/reset?code=${invite.code}`;
      ctx.reply(
        MESSAGES.RESETLINK_SUCCESS(
          username,
          link,
          formatDate(invite.expiresAt)
        )
      );
    } catch (error) {
      console.error("Error creating reset link:", error);
      ctx.reply(MESSAGES.RESETLINK_ERROR);
    }
  }

  private async handleInvites(ctx: Context): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    try {
      const invites = await listInvites();
      if (invites.length === 0) {
        ctx.reply(MESSAGES.INVITES_EMPTY);
        return;
      }
      const lines = invites
        .map((invite, index) => {
          const status = inviteStatus(invite);
          let detail = "";
          if (status === "pending") {
            detail = MESSAGES.INVITE_DETAIL_PENDING(
              formatDate(invite.expiresAt)
            );
          } else if (status === "used") {
            detail = MESSAGES.INVITE_DETAIL_USED(
              invite.usedByUsername ?? "?"
            );
          } else if (status === "expired") {
            detail = MESSAGES.INVITE_DETAIL_EXPIRED;
          } else {
            detail = MESSAGES.INVITE_DETAIL_REVOKED;
          }
          return MESSAGES.INVITE_LINE(
            index + 1,
            invite.kind ?? "signup",
            invite.name,
            status,
            detail
          );
        })
        .join("\n\n");
      ctx.reply(MESSAGES.INVITES_HEADER(invites.length) + lines);
    } catch (error) {
      console.error("Error listing invites:", error);
      ctx.reply(MESSAGES.INVITES_ERROR);
    }
  }

  private async handleRevoke(
    ctx: Context & { message: { text: string } }
  ): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    try {
      const code = ctx.message.text.split(" ").slice(1)[0]?.trim();
      if (!code) {
        ctx.reply(MESSAGES.REVOKE_USAGE);
        return;
      }
      const result = await revokeInviteCode(code);
      if (result === "revoked") {
        ctx.reply(MESSAGES.REVOKE_SUCCESS(code));
      } else if (result === "not_found") {
        ctx.reply(MESSAGES.REVOKE_NOT_FOUND);
      } else if (result === "already_used") {
        ctx.reply(MESSAGES.REVOKE_ALREADY_USED);
      } else {
        ctx.reply(MESSAGES.REVOKE_ALREADY_REVOKED);
      }
    } catch (error) {
      console.error("Error revoking invite:", error);
      ctx.reply(MESSAGES.REVOKE_ERROR);
    }
  }

  private setupCommands(): void {
    if (!this.bot) return;

    this.bot.start((ctx) => this.handleStart(ctx));
    this.bot.help((ctx) => this.handleHelp(ctx));
    this.bot.command("register", (ctx) => this.handleRegister(ctx));
    this.bot.command("invite", (ctx) => this.handleInvite(ctx));
    this.bot.command("resetlink", (ctx) => this.handleResetLink(ctx));
    this.bot.command("invites", (ctx) => this.handleInvites(ctx));
    this.bot.command("revoke", (ctx) => this.handleRevoke(ctx));
    this.bot.command("remove", (ctx) => this.handleRemove(ctx));
    this.bot.command("list", (ctx) => this.handleList(ctx));
    this.bot.command("backup", (ctx) => this.handleBackupCommand(ctx));
    this.bot.command("synccommands", (ctx) => this.handleSyncCommands(ctx));
    this.bot.action(/^backup:yes:([a-f0-9]+)$/i, (ctx) =>
      this.handleBackupYes(ctx)
    );
    this.bot.action(/^backup:no:([a-f0-9]+)$/i, (ctx) =>
      this.handleBackupNo(ctx)
    );
    this.bot.command("pending", (ctx) => this.handlePending(ctx));
    this.bot.command("approve", (ctx) => this.handleApproveCommand(ctx));
    this.bot.command("deny", (ctx) => this.handleDenyCommand(ctx));
    this.bot.action(/^approve:([a-f0-9]+)$/i, (ctx) => this.handleApprove(ctx));
    this.bot.action(/^deny:([a-f0-9]+)$/i, (ctx) => this.handleDeny(ctx));

    // Let the auth controller ping us when a new Google user needs approval.
    setPendingNotifier((user) => this.sendSignupPrompt(user));

    this.bot.on(message("text"), (ctx) => {
      if (!this.requireAdmin(ctx)) return;
    });
  }

  private async sendSignupPrompt(user: IUserDocument): Promise<void> {
    if (!this.bot || !this.adminChatId) return;
    await this.bot.telegram.sendMessage(
      this.adminChatId,
      MESSAGES.SIGNUP_PENDING(user.displayName, user.email ?? ""),
      Markup.inlineKeyboard([
        Markup.button.callback(MESSAGES.SIGNUP_BTN_APPROVE, `approve:${user._id}`),
        Markup.button.callback(MESSAGES.SIGNUP_BTN_DENY, `deny:${user._id}`),
      ])
    );
  }

  private async handleApprove(ctx: Context): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    await ctx.answerCbQuery();
    const id = (ctx.callbackQuery as { data?: string })?.data?.match(
      /^approve:([a-f0-9]+)$/i
    )?.[1];
    if (!id) return;
    const user = await User.findOneAndUpdate(
      { _id: id, isActive: false },
      { isActive: true }
    );
    await ctx.editMessageText(
      user ? MESSAGES.SIGNUP_APPROVED(user.displayName) : MESSAGES.SIGNUP_NOT_FOUND
    );
  }

  private async handleDeny(ctx: Context): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    await ctx.answerCbQuery();
    const id = (ctx.callbackQuery as { data?: string })?.data?.match(
      /^deny:([a-f0-9]+)$/i
    )?.[1];
    if (!id) return;
    const user = await User.findOneAndDelete({ _id: id, isActive: false });
    await ctx.editMessageText(
      user ? MESSAGES.SIGNUP_DENIED(user.displayName) : MESSAGES.SIGNUP_NOT_FOUND
    );
  }

  private async handlePending(ctx: Context): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    const pending = await User.find({ isActive: false }).sort({ createdAt: 1 });
    if (pending.length === 0) {
      await ctx.reply(MESSAGES.PENDING_EMPTY);
      return;
    }
    const lines = pending.map((u, i) =>
      MESSAGES.PENDING_LINE(i + 1, u.displayName, u.email ?? "")
    );
    await ctx.reply(MESSAGES.PENDING_HEADER(pending.length) + lines.join("\n"));
  }

  private async handleApproveCommand(ctx: Context): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    const email = this.commandArg(ctx);
    if (!email) return void ctx.reply(MESSAGES.APPROVE_USAGE);
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase(), isActive: false },
      { isActive: true }
    );
    await ctx.reply(
      user
        ? MESSAGES.SIGNUP_APPROVED(user.displayName)
        : MESSAGES.APPROVE_NOT_FOUND(email)
    );
  }

  private async handleDenyCommand(ctx: Context): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    const email = this.commandArg(ctx);
    if (!email) return void ctx.reply(MESSAGES.DENY_USAGE);
    const user = await User.findOneAndDelete({
      email: email.toLowerCase(),
      isActive: false,
    });
    await ctx.reply(
      user
        ? MESSAGES.SIGNUP_DENIED(user.displayName)
        : MESSAGES.APPROVE_NOT_FOUND(email)
    );
  }

  private commandArg(ctx: Context): string | null {
    const text = (ctx.message as { text?: string })?.text ?? "";
    const parts = text.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(" ").trim() : null;
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
    return this.bot.webhookCallback("/webhook/telegram", {
      secretToken: env.telegramWebhookSecret ?? undefined,
    }) as RequestHandler;
  }

  private async registerBotCommands(): Promise<void> {
    if (!this.bot) return;
    try {
      await this.bot.telegram.setMyCommands(
        TELEGRAM_BOT_COMMANDS.map((c) => ({
          command: c.command,
          description: c.description,
        }))
      );
      console.log(
        `Telegram bot commands registered (${TELEGRAM_BOT_COMMANDS.length})`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown";
      console.warn("Failed to register Telegram bot commands:", msg);
    }
  }

  private async handleSyncCommands(ctx: Context): Promise<void> {
    if (!this.requireAdmin(ctx)) return;
    if (!this.bot) return;
    try {
      await this.bot.telegram.setMyCommands(
        TELEGRAM_BOT_COMMANDS.map((c) => ({
          command: c.command,
          description: c.description,
        }))
      );
      const current = await this.bot.telegram.getMyCommands();
      const list = current.map((c) => `/${c.command}`).join(", ");
      ctx.reply(MESSAGES.SYNC_COMMANDS_OK(current.length, list));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown";
      ctx.reply(MESSAGES.SYNC_COMMANDS_ERROR(msg));
    }
  }

  async launch(): Promise<void> {
    if (!this.bot) {
      console.log("Telegram bot not configured. Skipping...");
      return;
    }
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Connectivity/token check so the retry loop still works.
        // Telegraf v4 bot.launch() (polling) only resolves when the bot
        // STOPS, so command registration and handlers must run before it.
        await this.bot.telegram.getMe();
        await this.registerBotCommands();
        process.once("SIGINT", () => this.bot?.stop("SIGINT"));
        process.once("SIGTERM", () => this.bot?.stop("SIGTERM"));

        if (env.telegramWebhookDomain) {
          const webhookUrl = `${env.telegramWebhookDomain}/webhook/telegram`;
          await this.bot.telegram.setWebhook(
            webhookUrl,
            env.telegramWebhookSecret
              ? { secret_token: env.telegramWebhookSecret }
              : undefined
          );
          console.log(`Telegram bot started (webhook: ${webhookUrl})`);
        } else {
          // Do not await: in polling mode this resolves only on stop.
          this.bot.launch().catch((err) => {
            const msg = err instanceof Error ? err.message : "Unknown";
            console.error("Telegram bot polling error:", msg);
          });
          console.log("Telegram bot started (polling)");
        }
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
