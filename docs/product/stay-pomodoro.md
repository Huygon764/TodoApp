# Stay and Pomodoro

Two independent timers in one modal, next to the one-off [Timer](timer.md). Stay is the daily countdown of time not
spent running away; what you do inside it is free. Pomodoro is a focus/rest
cycle. Neither is linked to Discipline.

## Stay

One level per day: 6h, 8h or 12h (default 8h).

- Before Start the level changes freely.
- After Start it can only go down. Going down to or below the time already
  stayed ends the day as done.
- After done the level is locked.

Start counts down from the level. Pause asks why:

- **Escape**: counted (adds one to the day's escapes).
- **Out**: not counted; its time is summed and shown as "out".

Pause is manual; Resume continues. At zero the day is done, `rest-start` plays
once and a toast says, with the day's level and escape count, "Stay done. 8h,
2 escapes." ("1 escape." for one).

## Day boundary

A day is a calendar date in the user's timezone. A day still running or paused
at midnight that did not reach its level is closed: the time is cut off at that
midnight, it keeps the time stayed and its escapes, is not done, and reads as
closed. The close is applied when the server next reads the state, not at
midnight itself. A running day that reached zero before midnight is done at
that instant, not closed. Past days are read-only. A new day starts not
started at 8h.

The Stay tab shows this week, Monday to today: one column per day filled by the
share of its level stayed, the escape count above it when above zero, and
"N of 7 reached" (N is the number of days reached).

## Pomodoro

- Presets 25/5 and 50/10, or Custom (focus 1-120, rest 1-60 minutes, whole
  numbers). The choice is saved per user and is the default next time.
- The preset changes only while stopped.
- Start, Pause/Resume and Stop. The cycle is focus, rest, focus, ... until Stop.
- Starting a focus plays `work-start`. A finished focus plays `rest-start` with
  a toast; a finished rest plays `work-start` with a toast. The toasts carry
  the chosen minutes, e.g. "Focus done. Rest 5m." and "Rest done. Focus 25m.".
- A round is one finished focus phase, counted on the date it ended. The count
  is shown as "N rounds today" ("1 round today" for one). Rounds of earlier weeks are dropped the next time the
  pomodoro is saved (a phase advanced or a write), not on every read.

## Timing and sound

Both timers are stored on the server as timestamps, so closing the tab or
switching device keeps the time. Pomodoro phases advance from the timestamps
while no tab is open, and rounds that passed while closed count. Sounds and
toasts play only in an open tab that saw the transition happen; one that
happened while closed is silent.

## Where it appears

- Desktop: a chip in the header. The Stay part reads "Stay" before Start, the
  remaining time while running or paused (with the escape count when above
  zero), and "<level>h done" (e.g. "8h done") when done. A second part shows the pomodoro time while
  it runs or is paused. A third part shows the [Timer](timer.md) while it runs,
  is paused or is done. Each part opens the modal on its tab.
- Mobile: Stay, Pomodoro and Timer items in the menu (the time while on, "done"
  for Stay and Timer when done), and a strip under the header while any of them
  runs or is paused, or the Timer is done.
- The modal has three tabs (Stay, Pomodoro, Timer), each with a state dot. It
  is a centered card on desktop and on mobile, like the other modals.
- The mobile strip is centered: each running timer, then the escape count.

Export and import include the stay days and the pomodoro settings (preset
only); import without them leaves them empty. Export first settles a past day
left running or paused: done if it reached its level, otherwise idle with its
counts kept, so it reads as closed.
