# Discipline (habits)

Things you must do on scheduled weekdays. Tick for the day; streaks, a 7-day
strip, and a 90-day heatmap. Skip (sick / rest) is a bridge: it does not add
to the streak and does not break it.

## Schedule

Each habit has `daysOfWeek` (Monday = 1 … Sunday = 7). Unscheduled days neither
extend nor break a streak.

## Tick and skip window

Today and yesterday (user timezone) may be ticked or skipped. Older days are
read-only. There is no back-fill beyond yesterday.

- Tick stores `kind: done`.
- Skip stores `kind: skipped` (visible cell, excluded from rate denominator).
- Skip one habit or skip the whole day (scheduled habits that are not already
  done). Unskip day removes only skipped logs.

Existing logs with no `kind` are done.

## Honest numbers

Current streak counts consecutive scheduled `done` days, walking back from
today. An un-ticked today does not break the streak. A skipped day is treated
like an unscheduled day. A missed scheduled day before today breaks the streak.

Rate and perfect-day stats ignore skipped scheduled days in the denominator.
Stats show how many habit-days were skipped in the last 30 days. There is no
skip cap.
