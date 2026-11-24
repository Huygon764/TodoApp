import { formatDateInTimeZone } from "./datePeriod.js";

const DEFAULT_TZ = "Asia/Ho_Chi_Minh";

function validZone(tz?: string | null): string {
  const zone = tz || DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: zone });
    return zone;
  } catch {
    return DEFAULT_TZ;
  }
}

/** Offset of the zone from UTC at an instant, in ms (local = utc + offset). */
function offsetMs(instantMs: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(instantMs));
  const get = (type: string): number =>
    Number(parts.find((p) => p.type === type)!.value);
  const local = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return local - Math.floor(instantMs / 1000) * 1000;
}

function parseDate(date: string): { y: number; m: number; d: number } {
  const [y, m, d] = date.split("-").map(Number);
  return { y: y!, m: m!, d: d! };
}

/** The instant (epoch ms) at which `date` (YYYY-MM-DD) begins in the zone. */
export function zonedMidnightMs(date: string, tz?: string | null): number {
  const zone = validZone(tz);
  const { y, m, d } = parseDate(date);
  const asUtc = Date.UTC(y, m - 1, d);
  const guess = asUtc - offsetMs(asUtc, zone);
  return asUtc - offsetMs(guess, zone);
}

/** Calendar arithmetic on YYYY-MM-DD strings (no timezone involved). */
export function addDays(date: string, days: number): string {
  const { y, m, d } = parseDate(date);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Monday of the week containing `date`. */
export function mondayOf(date: string): string {
  const { y, m, d } = parseDate(date);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7; // Mon=1..Sun=7
  return addDays(date, 1 - dow);
}

/** Every date from `from` to `to` inclusive. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function dateAt(instantMs: number, tz?: string | null): string {
  return formatDateInTimeZone(new Date(instantMs), tz);
}
