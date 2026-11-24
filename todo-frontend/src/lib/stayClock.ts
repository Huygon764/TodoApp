import type { StayDayView, StayLevel } from "@/types/stay";

export const HOUR_MS = 3_600_000;
export const STAY_LEVELS: readonly StayLevel[] = [6, 8, 12];

/** Server clock minus local clock; add it to Date.now() to get server time. */
export function serverOffsetMs(serverNow: string, localNowMs: number): number {
  const server = Date.parse(serverNow);
  return Number.isNaN(server) ? 0 : server - localNowMs;
}

function ms(iso: string | null): number | null {
  if (!iso) return null;
  const v = Date.parse(iso);
  return Number.isNaN(v) ? null : v;
}

/** Stayed time including the open running stretch, never above the level. */
export function stayStayedMs(day: StayDayView, nowMs: number): number {
  const since = day.status === "running" ? ms(day.runningSince) : null;
  const live = since == null ? 0 : Math.max(0, nowMs - since);
  return Math.min(day.level * HOUR_MS, day.stayedMs + live);
}

export function stayRemainingMs(day: StayDayView, nowMs: number): number {
  if (day.status === "done") return 0;
  return Math.max(0, day.level * HOUR_MS - stayStayedMs(day, nowMs));
}

/** Out time including an open Out pause. */
export function stayOutMs(day: StayDayView, nowMs: number): number {
  const since =
    day.status === "paused" && day.pausedAs === "out" ? ms(day.pausedSince) : null;
  return day.outMs + (since == null ? 0 : Math.max(0, nowMs - since));
}

/** The client countdown has hit zero while the stored state still says running. */
export function stayReachedZero(day: StayDayView, nowMs: number): boolean {
  return day.status === "running" && stayRemainingMs(day, nowMs) <= 0;
}

/** Share of the level stayed, 0..1. */
export function stayShare(day: StayDayView, nowMs: number): number {
  if (day.status === "done") return 1;
  return Math.min(1, stayStayedMs(day, nowMs) / (day.level * HOUR_MS));
}

/** h:mm:ss (hours optional). Rounds up so zero only shows at zero. */
export function formatClock(valueMs: number, withHours = true): string {
  const total = Math.max(0, Math.ceil(valueMs / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (withHours) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(h * 60 + m)}:${pad(s)}`;
}

/** "3h 12m" or "40m"; floors to whole minutes. */
export function formatHm(valueMs: number): string {
  const totalMin = Math.floor(Math.max(0, valueMs) / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export interface WeekColumn {
  /** Index 0 = Monday. */
  index: number;
  share: number;
  escapes: number;
  reached: boolean;
  isToday: boolean;
  /** A day after today: drawn empty. */
  future: boolean;
}

const DAY_MS = 86_400_000;

function dateMs(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

/**
 * Seven columns Monday..Sunday from `week` (Monday to today). Each entry goes
 * in the column of its `date`, so a missing day leaves a gap instead of
 * shifting the rest. The latest date is today and the only live one; past
 * days are final.
 */
export function weekColumns(week: StayDayView[], nowMs: number): WeekColumn[] {
  const byIndex = new Map<number, StayDayView>();
  const latest = week.reduce<StayDayView | null>(
    (acc, d) => (acc == null || d.date > acc.date ? d : acc),
    null,
  );
  let todayIndex = -1;
  if (latest) {
    const latestMs = dateMs(latest.date);
    const monday = latestMs - ((new Date(latestMs).getUTCDay() + 6) % 7) * DAY_MS;
    todayIndex = Math.round((latestMs - monday) / DAY_MS);
    for (const d of week) {
      const i = Math.round((dateMs(d.date) - monday) / DAY_MS);
      if (i >= 0 && i < 7) byIndex.set(i, d);
    }
  }

  const cols: WeekColumn[] = [];
  for (let i = 0; i < 7; i++) {
    const day = byIndex.get(i);
    if (!day) {
      cols.push({
        index: i,
        share: 0,
        escapes: 0,
        reached: false,
        isToday: false,
        future: i > todayIndex,
      });
      continue;
    }
    const isToday = day === latest;
    const share = isToday
      ? stayShare(day, nowMs)
      : day.status === "done"
        ? 1
        : Math.min(1, day.stayedMs / (day.level * HOUR_MS));
    cols.push({
      index: i,
      share,
      escapes: day.escapes,
      reached: day.status === "done" || share >= 1,
      isToday,
      future: false,
    });
  }
  return cols;
}

export function weekReached(cols: WeekColumn[]): number {
  return cols.filter((c) => c.reached).length;
}
