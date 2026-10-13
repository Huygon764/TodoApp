# Discipline (habits)

Things you must do on scheduled weekdays. Tick for the day; streaks, a 7-day
strip, and a 90-day heatmap. Skip is a day you could not do: it does not add
to the streak and does not break it. Every habit can also record a Slack, a
day you could do and did not. One Slack bridges. Two consecutive scheduled
Slacks break the streak.

## Schedule

Each habit has `daysOfWeek` (Monday = 1 … Sunday = 7). Unscheduled days neither
extend nor break a streak.

## Tick and skip window

Today and yesterday (user timezone) may be ticked or skipped. Older days are
read-only. There is no back-fill beyond yesterday.

- Tick stores `kind: done`.
- Skip stores `kind: skipped` (visible cell, excluded from rate denominator).
- Slack stores `kind: slack` on any habit (orange cell, excluded from the
  rate denominator). Choosing the active mark again clears the day.
- Skip one habit or skip the whole day. Skip day fills empty scheduled habits
  only and leaves Slack in place. Unskip day removes only skipped logs.
  There is no Slack-day action.

Existing logs with no `kind` are done.

## Honest numbers

Current streak counts consecutive scheduled `done` days, walking back from
today. An un-ticked today does not break the streak. A skipped day is treated
like an unscheduled day. One Slack does the same and does not add to the
streak. Two scheduled Slacks in a row break it; an unscheduled day or a Skip
between them still counts as consecutive. A missed scheduled day before today
breaks the streak. Marking the second Slack today breaks the streak then.

Rate and perfect-day stats ignore skipped and slack scheduled days in the
denominator. Stats show how many habit-days were skipped in the last 30 days.
There is no skip cap and no slack count.
