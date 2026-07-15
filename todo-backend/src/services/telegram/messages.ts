export const TELEGRAM_MESSAGES = {
  START_HEADER: "Todo App Bot\n\nCommands:\n",
  HELP_HEADER: "Help:\n\n",
  COMMAND_LIST:
    "/register <username> <password> - Create a new user\n" +
    "/invite <name> - Create a one-time signup link\n" +
    "/resetlink <username> - Create a password reset link\n" +
    "/invites - List invite codes\n" +
    "/revoke <code> - Revoke a pending invite\n" +
    "/remove <username> - Remove a user\n" +
    "/list - Show user list\n" +
    "/backup - Back up MongoDB now\n" +
    "/synccommands - Re-sync the bot command menu",
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
  INVITE_USAGE: "Usage: /invite <name of the person>",
  INVITE_SUCCESS: (name: string, link: string, expiresStr: string) =>
    `Invite created for "${name}".\n\nLink (one-time, valid until ${expiresStr}):\n${link}`,
  INVITE_ERROR: "An error occurred while creating the invite.",
  INVITES_EMPTY: "No invite codes yet.",
  INVITES_HEADER: (count: number) => `Invite codes (${count}):\n\n`,
  INVITE_LINE: (
    index: number,
    kind: string,
    name: string,
    status: string,
    detail: string
  ) => `${index}. [${kind}] ${name} - ${status}\n   ${detail}`,
  INVITE_DETAIL_PENDING: (expiresStr: string) => `expires ${expiresStr}`,
  INVITE_DETAIL_USED: (by: string) => `used by ${by}`,
  INVITE_DETAIL_EXPIRED: "expired",
  INVITE_DETAIL_REVOKED: "revoked",
  INVITES_ERROR: "An error occurred while fetching invite codes.",
  REVOKE_USAGE: "Usage: /revoke <code>",
  REVOKE_SUCCESS: (code: string) => `Invite "${code}" revoked.`,
  REVOKE_NOT_FOUND: "Invite code not found.",
  REVOKE_ALREADY_USED: "That invite has already been used.",
  REVOKE_ALREADY_REVOKED: "That invite is already revoked.",
  REVOKE_ERROR: "An error occurred while revoking the invite.",
  SYNC_COMMANDS_OK: (count: number, list: string) =>
    `Synced ${count} commands with Telegram:\n${list}\n\n` +
    `If typing "/" still shows nothing, fully close and reopen your ` +
    `Telegram app to clear its client-side cache.`,
  SYNC_COMMANDS_ERROR: (msg: string) => `Failed to sync commands: ${msg}`,
  RESETLINK_USAGE: "Usage: /resetlink <username>",
  RESETLINK_USER_NOT_FOUND: (name: string) => `User "${name}" not found.`,
  RESETLINK_SUCCESS: (name: string, link: string, expiresStr: string) =>
    `Password reset link for "${name}".\n\n` +
    `Link (one-time, valid until ${expiresStr}):\n${link}`,
  RESETLINK_ERROR: "An error occurred while creating the reset link.",
  SIGNUP_PENDING: (name: string, email: string) =>
    `New Google sign-up awaiting approval:\n\n${name}\n${email}`,
  SIGNUP_BTN_APPROVE: "Approve",
  SIGNUP_BTN_DENY: "Deny",
  SIGNUP_APPROVED: (name: string) => `Approved ${name}. They can sign in now.`,
  SIGNUP_DENIED: (name: string) => `Denied ${name}. The pending account was removed.`,
  SIGNUP_NOT_FOUND: "That pending account no longer exists.",
  PENDING_EMPTY: "No accounts awaiting approval.",
  PENDING_HEADER: (count: number) => `Pending approvals (${count}):\n\n`,
  PENDING_LINE: (index: number, name: string, email: string) =>
    `${index}. ${name} - ${email}`,
  APPROVE_USAGE: "Usage: /approve <email>",
  DENY_USAGE: "Usage: /deny <email>",
  APPROVE_NOT_FOUND: (email: string) => `No pending account for "${email}".`,
} as const;

/** Registered with Telegram so typing "/" shows the command menu */
export const TELEGRAM_BOT_COMMANDS = [
  { command: "register", description: "Create a new user" },
  { command: "invite", description: "Create a one-time signup link" },
  { command: "resetlink", description: "Create a password reset link" },
  { command: "invites", description: "List invite codes" },
  { command: "revoke", description: "Revoke a pending invite" },
  { command: "remove", description: "Remove a user" },
  { command: "list", description: "Show user list" },
  { command: "pending", description: "List sign-ups awaiting approval" },
  { command: "approve", description: "Approve a pending sign-up by email" },
  { command: "deny", description: "Deny a pending sign-up by email" },
  { command: "backup", description: "Back up MongoDB now" },
  { command: "synccommands", description: "Re-sync the bot command menu" },
  { command: "help", description: "Show help" },
] as const;
