export const API_PATHS = {
  AUTH_ME: "/api/auth/me",
  AUTH_LOGIN: "/api/auth/login",
  AUTH_LOGOUT: "/api/auth/logout",
  DAY: (date: string) => `/api/days/${date}`,
  DEFAULT: "/api/default",
  DEFAULT_BY_ID: (id: string) => `/api/default/${id}`,
  GOALS: "/api/goals",
  GOALS_QUERY: (type: "week" | "month", period: string) =>
    `/api/goals?type=${type}&period=${encodeURIComponent(period)}`,
  GOAL: (id: string) => `/api/goals/${id}`,
  GOAL_ITEM: (id: string, idx: number) => `/api/goals/${id}/items/${idx}`,
  GOAL_TEMPLATES: "/api/goals/templates",
  GOAL_TEMPLATES_QUERY: (type: "week" | "month") =>
    `/api/goals/templates?type=${type}`,
  GOAL_TEMPLATE_ITEM: (type: "week" | "month", idx: number) =>
    `/api/goals/templates/${type}/items/${idx}`,
  REVIEWS: "/api/reviews",
  REVIEWS_QUERY: (params: {
    type?: "week" | "month";
    period?: string;
    month?: string;
    from?: string;
    to?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params.type) sp.set("type", params.type);
    if (params.period) sp.set("period", params.period);
    if (params.month) sp.set("month", params.month);
    if (params.from) sp.set("from", params.from);
    if (params.to) sp.set("to", params.to);
    return `/api/reviews?${sp.toString()}`;
  },
  REVIEW: (id: string) => `/api/reviews/${id}`,
  REVIEWS_ANALYZE: "/api/reviews/analyze",
} as const;
