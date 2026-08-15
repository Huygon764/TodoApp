# Execution Plan: Discipline skip

Date: 2026-08-15

## Status

Active

## Outcome

Users can skip a habit or all scheduled habits for today or yesterday. Skip
bridges streaks, shows a distinct cell, and is excluded from rate denominators.

## Context

- Spec: `docs/specs/2026-08-15-discipline-skip-design.md`
- Decision: `docs/decisions/0001-discipline-skip.md`
- Product: `docs/product/discipline.md`

## Scope

In scope: HabitLog.kind, schedule math, panel/skip APIs, HabitPanel, heatmap,
stats skips30, i18n, README.

Out of scope: skip reasons, hard caps, dates older than yesterday.

## Approach

1. Extend `habitSchedule` with `skipDates` (TDD).
2. Persist `kind`, mutate logs for toggle/skip/skip-day with a two-day window.
3. Wire routes and panel query `date`.
4. Frontend panel + stats + copy.

## Progress

- [x] Schedule helpers
- [x] Service + API
- [x] Frontend
- [x] README

## Validation

- Focused: `todo-backend` `habitSchedule.test.ts`
- Frontend typecheck if available
