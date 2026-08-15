# Discipline skip (sick / rest days)

Date: 2026-08-15  
Status: Accepted design (not implemented)

## Problem

Discipline (habit) streaks break on any scheduled day without a tick. There is
no way to rest when sick without resetting the streak. Unscheduled weekdays
already bridge a streak; skip should behave the same, with a visible cell.

## Product rules

Skip is a **bridge**: it does not increment the streak and does not break it.

Skip exists at two levels:

- Per habit.
- Whole day: apply skip to every habit **scheduled that date** that is not
  already `done`.

Allowed dates: **today and yesterday** in the user's timezone. Older dates are
rejected. Viewing a day older than yesterday is read-only.

Heatmap / 7-day strip: distinct `skipped` cell (not `off`, not `missed`).

Completion rate and perfect-day math: skipped scheduled days are **excluded
from the denominator**. They do not count as done.

No hard skip cap. Stats show `skips30` (count of skipped habit-days in the
window).

No skip reason. No freeze economy. No skip of unscheduled habits.

## Data

`HabitLog` stays one document per `(userId, habitId, date)`.

Add `kind: "done" | "skipped"`. Missing `kind` on existing documents means
`done`.

Mutations:

- Tick: empty or `skipped` → `done`. Untick `done` → delete log.
- Skip habit: empty or `done` → `skipped`. Unskip → delete log.
- Skip day: upsert `skipped` for scheduled habits on that date that are not
  `done`. Leave `done` logs unchanged.
- Unskip day: delete all `skipped` logs for that date. Leave `done` unchanged.

Export/import includes `kind`. Import without `kind` treats the log as `done`.

## Streak and windows

`computeStreak` / `computeBestStreak` / `computeRate` / `windowStates` take
done dates and skip dates separately (or a map date → kind).

Walking a scheduled day:

- `done` → count toward streak / rate numerator.
- `skipped` → skip like an unscheduled weekday (no increment, no break); cell
  state `skipped`; not in rate denominator.
- no log, not today → miss; breaks streak; cell `missed`; in rate denominator
  as incomplete.
- no log, today → grace (streak does not break yet); UI does not treat today
  as a hard miss.

A miss from two days ago is not repaired by skipping yesterday.

## API

All dates are `YYYY-MM-DD`. Optional `date` defaults to today. Server rejects
dates other than today or yesterday (400). Unscheduled habit for that date:
400. Missing habit: 404.

- `GET /habits/today?date=` — panel for that date: habits scheduled that day,
  `done` / `skipped`, current streak, last7 including `skipped`.
- `POST /habits/:id/toggle` body `{ date? }` — done toggle; **yesterday
  allowed** (same window as skip). Older than yesterday still forbidden.
- `POST /habits/:id/skip` body `{ date? }` — skip cycle for one habit.
- `POST /habits/skip-day` body `{ date? }`
- `POST /habits/unskip-day` body `{ date? }`

Stats payload adds `skips30` (overall and per habit as needed for the modal).

## UI

`HabitPanel` when the selected day is today or yesterday: tick, per-row skip,
header Skip day / Unskip day. Other days: display only.

i18n: English and Vietnamese.

Optimistic updates must use `kind`, then invalidate habit queries.

## Tests (required)

- Skip between two `done` days bridges the streak.
- Missed day-before-yesterday plus skip yesterday does not restore the streak.
- Skip older than yesterday → 400.
- Rate excludes skips from the denominator.
- Skip-day does not change `done` logs.
- Log without `kind` counts as `done`.
- Toggle `done` on yesterday succeeds; older than yesterday fails.

## Out of scope

Skip reasons, hard caps, skip/tick beyond yesterday, skipping unscheduled
habits, notifications.
