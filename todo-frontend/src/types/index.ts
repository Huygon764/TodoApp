export interface User {
  _id: string;
  username: string;
  displayName: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DayTodoItem {
  title: string;
  completed: boolean;
  order: number;
}

export interface DayTodo {
  _id: string;
  userId: string;
  date: string;
  items: DayTodoItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DefaultItem {
  _id: string;
  userId: string;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoalItem {
  title: string;
  completed: boolean;
  order: number;
}

export interface Goal {
  _id: string;
  userId: string;
  type: "week" | "month" | "year";
  period: string;
  items: GoalItem[];
  createdAt: string;
  updatedAt: string;
}

export interface GoalTemplateItem {
  title: string;
  order: number;
}

export interface GoalTemplate {
  _id: string;
  userId: string;
  type: "week" | "month" | "year";
  items: GoalTemplateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  userId: string;
  type: "week" | "month";
  period: string;
  goodThings: string[];
  badThings: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}
