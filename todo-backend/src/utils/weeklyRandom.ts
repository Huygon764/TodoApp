/** ISO weekday 1 = Monday … 7 = Sunday. */
export function pickWeeklyRandomWeekday(
  userId: string,
  title: string,
  weekPeriod: string,
): number {
  const key = `${userId}\n${title.trim()}\n${weekPeriod}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (Math.abs(hash) % 7) + 1;
}

export function shouldIncludeWeeklyItem(
  item: { title: string; daysOfWeek?: number[]; weeklyRandom?: boolean },
  weekdayIndex: number,
  isMonday: boolean,
  userId: string,
  weekPeriod: string,
): boolean {
  if (item.weeklyRandom) {
    return pickWeeklyRandomWeekday(userId, item.title, weekPeriod) === weekdayIndex;
  }
  if (Array.isArray(item.daysOfWeek) && item.daysOfWeek.length > 0) {
    return item.daysOfWeek.includes(weekdayIndex);
  }
  return isMonday;
}
