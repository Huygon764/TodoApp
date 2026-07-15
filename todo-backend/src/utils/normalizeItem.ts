/**
 * Normalize a todo item from API input. Shared across dayController, goalController, freetimeTodoController.
 */
interface RawCounterSubTask {
  title?: string;
  completed?: boolean;
  target?: number;
  count?: number;
}

export interface RawTodoItem {
  title?: string;
  completed?: boolean;
  order?: number;
  target?: number;
  count?: number;
  subTasks?: RawCounterSubTask[];
  carriedFrom?: string;
  postponeCount?: number;
}

interface NormalizedCounterSubTask {
  title: string;
  completed: boolean;
  target?: number;
  count?: number;
}

export interface NormalizedTodoItem {
  title: string;
  completed: boolean;
  order: number;
  target?: number;
  count?: number;
  subTasks?: NormalizedCounterSubTask[];
  carriedFrom?: string;
  postponeCount?: number;
}

/** A counter target below 2 is not a counter; drop it and its count. */
function counterFields(source: { target?: number; count?: number }): {
  target?: number;
  count?: number;
} {
  if (typeof source.target !== "number" || source.target < 2) return {};
  const count =
    typeof source.count === "number"
      ? Math.max(0, Math.min(source.target, Math.trunc(source.count)))
      : 0;
  return { target: Math.trunc(source.target), count };
}

export function normalizeItem(
  item: RawTodoItem,
  index: number
): NormalizedTodoItem {
  const normalized: NormalizedTodoItem = {
    title: (item.title ?? "").trim(),
    completed: Boolean(item.completed),
    order: typeof item.order === "number" ? item.order : index,
    ...counterFields(item),
    subTasks: Array.isArray(item.subTasks)
      ? item.subTasks.map((st) => ({
          title: (st.title ?? "").trim(),
          completed: Boolean(st.completed),
          ...counterFields(st),
        }))
      : undefined,
  };

  // Preserve carry-over metadata so toggling/editing a carried task via
  // PATCH does not strip it. Only dayTodo items send these fields; goal
  // and freetimeTodo never do, so their normalized output is unchanged.
  if (typeof item.carriedFrom === "string" && item.carriedFrom.trim()) {
    normalized.carriedFrom = item.carriedFrom;
  }
  if (typeof item.postponeCount === "number" && item.postponeCount > 0) {
    normalized.postponeCount = item.postponeCount;
  }

  return normalized;
}

export function normalizeItems(items: RawTodoItem[]): NormalizedTodoItem[] {
  return items.map(normalizeItem);
}

export interface RawSubTaskTitle {
  title?: string;
}

/**
 * Normalize subtasks that only carry a title (no completed flag).
 * Returns undefined when nothing remains, so callers can drop the field.
 */
export function normalizeSubTaskTitles(
  subTasks: unknown
): { title: string }[] | undefined {
  if (!Array.isArray(subTasks)) return undefined;
  const cleaned = (subTasks as RawSubTaskTitle[])
    .map((st) => ({ title: (st.title ?? "").trim() }))
    .filter((st) => st.title.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}
