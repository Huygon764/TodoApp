export const ROUTES = {
  LOGIN: "/login",
  HOME: "/",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
