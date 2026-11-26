# Timer

Date: 2026-11-26  
Status: Draft, for the owner's review

Mockup: [`assets/2026-11-26-timer/index.html`](assets/2026-11-26-timer/index.html)
(open it over a local HTTP server started at the repo root, as for the Stay
mockup; the bottom bar switches desktop/mobile and speeds time up 600x).

Builds on [Stay and Pomodoro](2026-11-24-stay-pomodoro-design.md): same modal,
chip, strip, colors and storage rules.

## Problem

After Stay and Pomodoro, the owner asked for a timer: "I want to add timer in
todo-app". Of the kinds offered (simple countdown, per-todo time tracking,
stopwatch, wall-clock alarm) he chose **simple countdown**: set a length, it
rings at zero. It is a utility for things like cooking or a nap, separate from
Stay and Pomodoro.

## Timer

- One timer at a time.
- Length: presets **5m, 10m, 15m, 30m, 1h**, plus **Custom** (hours and
  minutes inputs, 1 minute to 24 hours, the site-blocker timer's upper clamp).
  The last length used is saved per user and is the default next time.
- Label: optional, up to 40 characters ("Cooking", "Nap"). Shown under the
  ring and in the chip. Cleared after Dismiss.
- Controls: Start; while running, Pause, Stop, **+1m** and **+5m**; while
  paused, Resume, Stop, +1m and +5m. Remaining time is capped at 24 hours.
- Length and label can be changed only while stopped.
- Independent of Stay and Pomodoro: it runs, pauses and stops on its own.
- No history.

### At zero

- `rest-start.wav` plays **5 times** with a 300 ms gap, as the site-blocker
  timer does (`site-blocker/lib/timer-controller.ts:14-15`,
  `entrypoints/offscreen/main.ts:3`).
- A toast says "Timer done." or "Timer done: Cooking."
- The timer is **done** until dismissed: the chip shows "Done", the tab shows
  a Dismiss button. Dismiss stops the sound and returns the timer to stopped,
  with the same length.
- Start from done is not offered; Dismiss first.

## Timing and sound

As Stay and Pomodoro: stored on the server per user as timestamps; the client
computes the display; the server settles a timer that reached zero before every
reply. Sound plays only while an Orbit tab is open. A timer that reached zero
while closed plays nothing; opening Orbit shows it done.

## UI

Follows `DESIGN.md` and the Stay and Pomodoro UI. The mockup is the reference.

### Entry points

- **Desktop header chip**: a third part, shown only while the timer runs, is
  paused or is done: the remaining time, or "Done" with the done dot. It opens
  the modal on the Timer tab.
- **Mobile**: a third menu item, Timer, with its time while running or paused,
  "done" when done. The strip shows the timer while it runs, is paused or is
  done, next to Stay and Pomodoro.

### Modal

The modal gets a third tab, **Timer**, after Pomodoro, with a state dot.

Timer tab, top to bottom:

1. Presets as a segmented control (5m / 10m / 15m / 30m / 1h / Custom); Custom
   opens hours and minutes inputs. Locked (dimmed) unless stopped.
2. Label input, one line, placeholder "Label (optional)". Locked unless
   stopped.
3. The circular timer: remaining time in the middle; under it the label, or
   the state (ready / running / paused / done) when there is no label.
4. Actions: stopped, Start; running, Pause and Stop, then +1m and +5m; paused,
   Resume and Stop, then +1m and +5m; done, Dismiss.

Ring colors: navy accent running, `pause` paused, `done` done. No new tokens.

### Language

English and Vietnamese strings in `locales/en.json` and `vi.json`. "Timer"
is translated ("Hẹn giờ").

## Data

`Timer`, one document per user:

- `lengthMs`: the length last set (default 10 minutes).
- `label`.
- `status`: `stopped | running | paused | done`.
- `endsAt` (running), `remainingMs` (paused), `doneAt` (done).

Routes under `/timer`: GET, `start {lengthMs, label}`, `pause`, `resume`,
`add {ms}`, `stop`, `dismiss`. `add` is refused unless running or paused
(409); `start` is refused unless stopped (409).

Export/import does not carry the timer: it is a short-lived utility. Import
leaves it stopped at the default length.

## Glossary

Add to `GLOSSARY.md`:

- **Timer**: a one-off countdown with an optional label. _Avoid_: alarm,
  stopwatch.

## Out of scope

- Several timers at once.
- Timer history.
- Sound when no Orbit tab is open (push notifications, PWA).
- Wall-clock alarms, stopwatch, per-todo time tracking.

## Proof

- Backend tests: countdown from timestamps across pause/resume; +1m/+5m while
  running and while paused, capped at 24 hours; zero reached while no request
  comes settles to done on the next GET; dismiss returns to stopped with the
  same length; start and add refused in the wrong state; length clamped to 1
  minute to 24 hours; label over 40 characters refused.
- Frontend: the Timer tab, chip part, menu item and strip checked in the
  browser on desktop and mobile widths against the mockup; the done sound plays
  5 times and Dismiss stops it.
