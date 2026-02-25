export interface User {
  _id: string;
  username: string;
  displayName: string;
  isActive: boolean;
  lastLogin: string | null;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DayTodoSubTask {
  title: string;
  completed: boolean;
}

export interface DayTodoItem {
  title: string;
  completed: boolean;
  order: number;
  subTasks?: DayTodoSubTask[];
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

export interface GoalSubTask {
  title: string;
  completed: boolean;
}

export interface GoalItem {
  title: string;
  completed: boolean;
  order: number;
  subTasks?: GoalSubTask[];
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

export interface RecurringTemplateItem {
  title: string;
  order: number;
  /** 1-7, 1 = Monday, 7 = Sunday (for weekly templates) */
  daysOfWeek?: number[];
  /** 1-31 (for monthly templates) */
  daysOfMonth?: number[];
  /** Specific days in year (for yearly templates) */
  datesOfYear?: { month: number; day: number }[];
}

export interface RecurringTemplate {
  _id: string;
  userId: string;
  type: "week" | "month" | "year";
  items: RecurringTemplateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DateTemplateItem {
  title: string;
  order: number;
}

export interface DateTemplate {
  _id: string;
  userId: string;
  date: string;
  items: DateTemplateItem[];
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

export interface FreetimeSubTask {
  title: string;
  completed: boolean;
}

export interface FreetimeTodoItem {
  title: string;
  completed: boolean;
  order: number;
  subTasks?: FreetimeSubTask[];
}

export interface FreetimeTodo {
  _id: string;
  userId: string;
  items: FreetimeTodoItem[];
  createdAt: string;
  updatedAt: string;
}
