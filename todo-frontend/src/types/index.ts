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
