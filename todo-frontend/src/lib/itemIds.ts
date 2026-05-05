export function addClientIds<
  T extends { title: string; subTasks?: unknown[] },
>(
  items: T[],
  prefix: string,
  slugLength = 10,
): Array<T & { id: string; subTasks: NonNullable<T["subTasks"]> }> {
  return items.map((item, index) => ({
    ...item,
    id: `${prefix}-${index}-${item.title.slice(0, slugLength)}`,
    subTasks: (item.subTasks ?? []) as NonNullable<T["subTasks"]>,
  }));
}

export function removeClientIds<T extends { id: string }>(
  items: T[],
): Array<Omit<T, "id">> {
  return items.map(({ id: _id, ...rest }) => rest as Omit<T, "id">);
}
