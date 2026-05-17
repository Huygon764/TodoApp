export const ROUTES = {
  LOGIN: "/login",
  REGISTER: "/register",
  RESET: "/reset",
  HOME: "/",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
