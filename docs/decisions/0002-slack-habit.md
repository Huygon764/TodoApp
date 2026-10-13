# 0002 Slack habit

Date: 2026-10-03

## Status

Accepted

## Context

Skip means a scheduled day you could not do. It bridges a streak with no cap.
A day you could do and chose not to had no name, so the only honest record was
a miss, and one miss breaks the streak. Doing every scheduled day without a
chosen pause leads to burnout.

## Decision

Every habit can record a Slack. There is no per-habit switch.

Slack is a `HabitLog.kind` of `slack`, allowed for today and yesterday on a
scheduled day. It is a day you could do and did not. One Slack does not
increment the streak and does not break it. Two consecutive
scheduled Slacks break the streak. An unscheduled day or a Skip between them
still counts as consecutive. A pattern of done, Slack, done may repeat.

An unmarked scheduled day before today is still a miss and breaks the streak.
Marking the second Slack today breaks the streak immediately.

Slack is excluded from completion-rate denominators. There is no Slack count
in stats. `skips30` stays the Skip count.

The day cell and the row use orange. Skip stays sky, miss stays red, done
stays purple. Copy is "Slack" in English and "Lười" in Vietnamese.

On every habit the existing moon control chooses Skip or Slack. Choosing the
active one again clears the day. Tick still sets done. There is no Slack-day
action. Skip day fills empty scheduled habits only and leaves Slack in place.
Unskip day removes Skip only.

Skip is unchanged.

## Alternatives Considered

1. Change Skip so the second Skip breaks the streak.
2. Forgive the first unmarked miss automatically.
3. A weekly Slack quota instead of consecutive scheduled days.
4. A separate always-visible Slack button on the habit row.
5. A per-habit switch before Slack is available.

## Consequences

Positive:

- One chosen pause does not reset a streak.
- Skip (could not) and Slack (would not) stay distinct on the heatmap.

Tradeoffs:

- Done, Slack, done can repeat without breaking the streak.
- Skip day will not override a Slack already recorded that day.
