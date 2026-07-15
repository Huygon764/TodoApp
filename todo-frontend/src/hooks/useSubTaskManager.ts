import { useCallback } from "react";
import { parseTarget } from "@/lib/parseTarget";

interface ManagedSubTask {
  title: string;
  completed?: boolean;
  target?: number;
  count?: number;
}

interface ManagedItem {
  id: string;
  completed?: boolean;
  subTasks?: ManagedSubTask[];
}

export function useSubTaskManager<T extends ManagedItem>(
  items: T[],
  onItemsChange: (next: T[]) => void,
) {
  const addSubTask = useCallback(
    (itemId: string, rawTitle: string) => {
      const trimmed = rawTitle.trim();
      if (!trimmed) return;
      const { title, target } = parseTarget(trimmed);
      const next = items.map((item) => {
        if (item.id !== itemId) return item;
        const subTasks = item.subTasks ?? [];
        const newSubTask: ManagedSubTask = target
          ? { title, completed: false, target, count: 0 }
          : { title, completed: false };
        return {
          ...item,
          subTasks: [...subTasks, newSubTask],
        } as T;
      });
      onItemsChange(next);
    },
    [items, onItemsChange],
  );

  const toggleSubTask = useCallback(
    (itemId: string, subIndex: number) => {
      const next = items.map((item) => {
        if (item.id !== itemId) return item;
        const subTasks = (item.subTasks ?? []).map((st, i) => {
          if (i !== subIndex) return st;
          const nextCompleted = !st.completed;
          // A counter sub-task's checkbox fills or empties its count.
          if (st.target != null) {
            return { ...st, completed: nextCompleted, count: nextCompleted ? st.target : 0 };
          }
          return { ...st, completed: nextCompleted };
        });
        const allCompleted =
          subTasks.length > 0 && subTasks.every((st) => st.completed);
        return {
          ...item,
          subTasks,
          completed: allCompleted ? true : item.completed,
        } as T;
      });
      onItemsChange(next);
    },
    [items, onItemsChange],
  );

  const incrementSubTask = useCallback(
    (itemId: string, subIndex: number) => {
      const next = items.map((item) => {
        if (item.id !== itemId) return item;
        const subTasks = (item.subTasks ?? []).map((st, i) => {
          if (i !== subIndex || st.target == null) return st;
          const target = st.target;
          const current = st.count ?? 0;
          const nextCount = current >= target ? 0 : current + 1;
          return { ...st, count: nextCount, completed: nextCount >= target };
        });
        const allCompleted =
          subTasks.length > 0 && subTasks.every((st) => st.completed);
        return {
          ...item,
          subTasks,
          completed: allCompleted ? true : item.completed,
        } as T;
      });
      onItemsChange(next);
    },
    [items, onItemsChange],
  );

  const deleteSubTask = useCallback(
    (itemId: string, subIndex: number) => {
      const next = items.map((item) => {
        if (item.id !== itemId) return item;
        const subTasks = (item.subTasks ?? []).filter(
          (_, i) => i !== subIndex,
        );
        return { ...item, subTasks } as T;
      });
      onItemsChange(next);
    },
    [items, onItemsChange],
  );

  const editSubTask = useCallback(
    (itemId: string, subIndex: number, newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;
      const next = items.map((item) => {
        if (item.id !== itemId) return item;
        const subTasks = (item.subTasks ?? []).map((st, i) =>
          i === subIndex ? { ...st, title: trimmed } : st,
        );
        return { ...item, subTasks } as T;
      });
      onItemsChange(next);
    },
    [items, onItemsChange],
  );

  const moveSubTask = useCallback(
    (itemId: string, subIndex: number, direction: "up" | "down") => {
      const next = items.map((item) => {
        if (item.id !== itemId) return item;
        const subTasks = [...(item.subTasks ?? [])];
        const target = direction === "up" ? subIndex - 1 : subIndex + 1;
        if (target < 0 || target >= subTasks.length) return item;
        [subTasks[subIndex], subTasks[target]] = [
          subTasks[target]!,
          subTasks[subIndex]!,
        ];
        return { ...item, subTasks } as T;
      });
      onItemsChange(next);
    },
    [items, onItemsChange],
  );

  return {
    addSubTask,
    toggleSubTask,
    incrementSubTask,
    deleteSubTask,
    editSubTask,
    moveSubTask,
  };
}
