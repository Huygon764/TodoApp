# 0001 Discipline skip as streak bridge

Date: 2026-08-15

## Status

Accepted

## Context

Scheduled missed days reset habit streaks. Rest (illness) had no honest
representation. Unscheduled weekdays already bridge streaks.

## Decision

Skip is a `HabitLog.kind` of `skipped`, allowed for today and yesterday only.
It bridges the streak like an unscheduled day, shows a distinct heatmap cell,
and is excluded from completion-rate denominators. Skip applies per habit and
as a whole-day apply to remaining scheduled habits. No hard cap; stats expose
skip counts. Tick is allowed on the same two-day window.

## Alternatives Considered

1. Skip counts as done (inflates streak).
2. Freeze streak without bridging the next done day.
3. Hard monthly cap / freeze economy.
4. Separate day-skip collection besides logs.
5. Skip any historical day (breaks no-back-fill).

## Consequences

Positive:

- Illness does not force a streak reset.
- Heatmap still distinguishes rest from off-schedule and from misses.

Tradeoffs:

- Yesterday tick is a deliberate hole in “today-only” honesty.
- Unlimited skips can hide avoidance; mitigated by visible skip counts.

## Follow-Up

- Implement per `docs/specs/2026-08-15-discipline-skip-design.md`.
