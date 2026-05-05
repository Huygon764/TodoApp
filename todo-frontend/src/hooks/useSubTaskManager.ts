import { useCallback } from "react";

interface ManagedSubTask {
  title: string;
  completed?: boolean;
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
    (itemId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const next = items.map((item) => {
        if (item.id !== itemId) return item;
        const subTasks = item.subTasks ?? [];
        return {
          ...item,
          subTasks: [...subTasks, { title: trimmed, completed: false }],
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
        const subTasks = (item.subTasks ?? []).map((st, i) =>
          i === subIndex ? { ...st, completed: !st.completed } : st,
        );
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

  return { addSubTask, toggleSubTask, deleteSubTask };
}
