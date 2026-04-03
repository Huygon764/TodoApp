export function removeAndReorder<T extends { order: number }>(
  items: T[],
  index: number
): void {
  items.splice(index, 1);
  items.forEach((item, i) => {
    item.order = i;
  });
}
