/**
 * Normalize a todo item from API input. Shared across dayController, goalController, freetimeTodoController.
 */
export interface RawTodoItem {
  title?: string;
  completed?: boolean;
  order?: number;
  subTasks?: { title?: string; completed?: boolean }[];
}

export interface NormalizedTodoItem {
  title: string;
  completed: boolean;
  order: number;
  subTasks?: { title: string; completed: boolean }[];
}

export function normalizeItem(
  item: RawTodoItem,
  index: number
): NormalizedTodoItem {
  return {
    title: (item.title ?? "").trim(),
    completed: Boolean(item.completed),
    order: typeof item.order === "number" ? item.order : index,
    subTasks: Array.isArray(item.subTasks)
      ? item.subTasks.map((st) => ({
          title: (st.title ?? "").trim(),
          completed: Boolean(st.completed),
        }))
      : undefined,
  };
}

export function normalizeItems(items: RawTodoItem[]): NormalizedTodoItem[] {
  return items.map(normalizeItem);
}
