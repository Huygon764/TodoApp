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

export interface BaseSubTask {
  title: string;
  /** Repetition target; when set, this sub-task is a counter. */
  target?: number;
}

export interface CheckableSubTask extends BaseSubTask {
  completed: boolean;
  /** Progress toward `target`; 0..target. */
  count?: number;
}

export type DayTodoSubTask = CheckableSubTask;

export interface DayTodoItem {
  title: string;
  completed: boolean;
  order: number;
  /** Repetition target; when set, this item is a counter (no subTasks). */
  target?: number;
  /** Progress toward `target`; 0..target. */
  count?: number;
  subTasks?: DayTodoSubTask[];
  /** Original date (YYYY-MM-DD) this task was first postponed from */
  carriedFrom?: string;
  /** Number of times this task has been carried over to a later day */
  postponeCount?: number;
}

export interface DayTodo {
  _id: string;
  userId: string;
  date: string;
  items: DayTodoItem[];
  /** One-line end-of-day reflection (breadcrumb for assisted review) */
  reflection?: string;
  /** Self-reported mood for the day, 1 (low) to 5 (high) */
  mood?: number;
  /** Self-reported energy for the day, 1 (low) to 5 (high) */
  energy?: number;
  /** One line of gratitude for the day */
  gratitude?: string;
  createdAt: string;
  updatedAt: string;
}

/** Editable reflection fields of a day. null clears mood/energy. */
export interface DayReflectionMeta {
  reflection?: string;
  mood?: number | null;
  energy?: number | null;
  gratitude?: string;
}

/** A past day resurfaced in the "on this day" section. */
export interface DayFlashback {
  key: "monthAgo" | "yearAgo";
  date: string;
  mood: number | null;
  energy: number | null;
  reflection: string;
  gratitude: string;
}

export type DefaultItemSubTask = BaseSubTask;

export interface DefaultItem {
  _id: string;
  userId: string;
  title: string;
  order: number;
  target?: number;
  subTasks?: DefaultItemSubTask[];
  createdAt: string;
  updatedAt: string;
}

export type GoalSubTask = CheckableSubTask;

export interface GoalItem {
  title: string;
  completed: boolean;
  order: number;
  target?: number;
  count?: number;
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

export type RecurringTemplateSubTask = BaseSubTask;

export interface RecurringTemplateItem {
  title: string;
  order: number;
  target?: number;
  /** 1-7, 1 = Monday, 7 = Sunday (for weekly templates) */
  daysOfWeek?: number[];
  /** 1-31 (for monthly templates) */
  daysOfMonth?: number[];
  /** Specific days in year (for yearly templates) */
  datesOfYear?: { month: number; day: number }[];
  subTasks?: RecurringTemplateSubTask[];
}

export interface RecurringTemplate {
  _id: string;
  userId: string;
  type: "week" | "month" | "year";
  items: RecurringTemplateItem[];
  createdAt: string;
  updatedAt: string;
}

export type DateTemplateSubTask = BaseSubTask;

export interface DateTemplateItem {
  title: string;
  order: number;
  target?: number;
  subTasks?: DateTemplateSubTask[];
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

export interface PersonNote {
  _id: string;
  userId: string;
  name: string;
  notes: string[];
  order: number;
  /** "person" for people, "object" for things to remember. Legacy notes omit it. */
  category?: "person" | "object";
  createdAt: string;
  updatedAt: string;
}

export type FreetimeSubTask = CheckableSubTask;

export interface FreetimeTodoItem {
  title: string;
  completed: boolean;
  order: number;
  target?: number;
  count?: number;
  subTasks?: FreetimeSubTask[];
}

export interface FreetimeTodo {
  _id: string;
  userId: string;
  items: FreetimeTodoItem[];
  createdAt: string;
  updatedAt: string;
}

export type HabitDayState = "done" | "missed" | "off";

export interface Habit {
  _id: string;
  userId: string;
  name: string;
  /** 1 = Monday .. 7 = Sunday; non-empty */
  daysOfWeek: number[];
  order: number;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HabitDayCell {
  date: string;
  state: HabitDayState;
}

export interface HabitTodayEntry {
  id: string;
  name: string;
  daysOfWeek: number[];
  order: number;
  doneToday: boolean;
  streak: number;
  last7: HabitDayCell[];
}

export interface HabitToday {
  today: string;
  habits: HabitTodayEntry[];
}

export interface HabitStatsEntry {
  id: string;
  name: string;
  streak: number;
  bestStreak: number;
  rate30: number;
  days: HabitDayCell[];
}

export interface HabitStats {
  overall: {
    bestStreak: number;
    rate30: number;
    perfectDays30: number;
    totalDays: number;
  };
  habits: HabitStatsEntry[];
  worst: { id: string; name: string; rate30: number; breaks30: number } | null;
}
