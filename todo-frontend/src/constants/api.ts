export const API_PATHS = {
  AUTH_ME: "/api/auth/me",
  AUTH_LOGIN: "/api/auth/login",
  AUTH_LOGOUT: "/api/auth/logout",
  DAY: (date: string) => `/api/days/${date}`,
  DEFAULT: "/api/default",
  DEFAULT_BY_ID: (id: string) => `/api/default/${id}`,
} as const;
