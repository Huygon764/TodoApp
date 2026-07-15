/**
 * Parse a trailing "xN" repetition suffix out of a task title.
 *
 * "Pull up x20" -> { title: "Pull up", target: 20 }
 * "Read"        -> { title: "Read" }              (no suffix)
 * "Read x1"     -> { title: "Read x1" }           (N < 2 is not a counter)
 * "x20"         -> { title: "x20" }               (no title left of the suffix)
 *
 * The match is case-insensitive ("X3" works) and only runs on the raw add
 * input, never on a rename, so a title that must literally end in "x20" can be
 * set by editing afterwards.
 */
export interface ParsedTarget {
  title: string;
  target?: number;
}

const SUFFIX = /^(.*\S)\s+x(\d{1,3})$/i;

export function parseTarget(raw: string): ParsedTarget {
  const trimmed = raw.trim();
  const match = SUFFIX.exec(trimmed);
  if (!match) return { title: trimmed };

  const title = match[1].trim();
  const target = Number(match[2]);
  if (!title || target < 2) return { title: trimmed };

  return { title, target };
}
