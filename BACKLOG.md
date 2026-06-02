# Backlog

Deferred work, kept here so it is not lost.

## Daily Reflection — Phase 2

Shipped (MVP, 2026-06): per-day journal, mood (1-5), energy (1-5), gratitude, and an
"on this day" flashback (same calendar day one month and one year earlier).

Deferred:

- **Mood / energy trend chart.** Self-reported mood and energy are trustworthy signals
  (unlike task completion, which the user often clears), so a trend over time is a
  meaningful insight. Build once a few weeks of data have accumulated — before that the
  chart is empty/noise. Likely a small chart in a Reflection modal or a section in the
  review flow. Backend: `GET /api/reflection/trend?days=30` returning
  `[{ date, mood?, energy? }]` for days that have values.
- **Feed reflection into the week review.** Pull the week's journal entries and gratitude
  lines into the existing week-review draft, so writing a weekly review starts from real
  material instead of a blank form.
