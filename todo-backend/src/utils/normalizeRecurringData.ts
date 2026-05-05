export function normalizeUniqueSortedInts(
  values: unknown,
  min: number,
  max: number,
): number[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const cleaned = Array.from(
    new Set(
      values
        .map((val) => Number(val))
        .filter((num) => Number.isInteger(num) && num >= min && num <= max),
    ),
  ).sort((a, b) => a - b);
  return cleaned.length > 0 ? cleaned : undefined;
}

export function normalizeDatesOfYear(
  values: unknown,
): { month: number; day: number }[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const seen = new Set<string>();
  const cleaned: { month: number; day: number }[] = [];
  for (const entry of values) {
    const month = Number((entry as { month?: unknown })?.month);
    const day = Number((entry as { day?: unknown })?.day);
    if (
      Number.isInteger(month) &&
      month >= 1 &&
      month <= 12 &&
      Number.isInteger(day) &&
      day >= 1 &&
      day <= 31
    ) {
      const key = `${month}-${day}`;
      if (!seen.has(key)) {
        seen.add(key);
        cleaned.push({ month, day });
      }
    }
  }
  return cleaned.length > 0 ? cleaned : undefined;
}
