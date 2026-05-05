interface CompletableOrdered {
  completed: boolean;
  order: number;
}

export function sortItemsByCompletion<T extends CompletableOrdered>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    if (a.completed === b.completed) return a.order - b.order;
    return a.completed ? 1 : -1;
  });
}

export function regroupByCompletion<T extends CompletableOrdered>(
  items: T[],
): T[] {
  const incomplete = items.filter((it) => !it.completed);
  const completed = items.filter((it) => it.completed);
  return [
    ...incomplete.map((it, idx) => ({ ...it, order: idx })),
    ...completed.map((it, idx) => ({
      ...it,
      order: incomplete.length + idx,
    })),
  ];
}
