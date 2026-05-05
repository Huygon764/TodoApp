export const TELEGRAM_MESSAGES = {
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
