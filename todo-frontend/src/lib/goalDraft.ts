/** Framer Reorder fires [] when the group unmounts; that is not a user clear. */
export function isSpuriousReorder<T>(next: T[], previous: T[]): boolean {
  return next.length === 0 && previous.length > 0;
}

/** Persist order on close only when local draft is a real edit, not an emptied ghost. */
export function shouldPersistGoalItemsOnClose(opts: {
  hasGoal: boolean;
  localCount: number;
  serverCount: number;
  currentOrder: string;
  initialOrder: string;
}): boolean {
  if (!opts.hasGoal) return false;
  if (opts.localCount === 0 && opts.serverCount > 0) return false;
  return opts.currentOrder !== opts.initialOrder;
}
