# Stay and Pomodoro

Date: 2026-11-24  
Status: Draft for owner review (not implemented)

Mockup: [`assets/2026-11-24-stay-pomodoro/index.html`](assets/2026-11-24-stay-pomodoro/index.html)
(open it over a local HTTP server; the bottom bar switches desktop/mobile and
speeds time up 600x).

## Problem

The owner's words: "every day I have a item daily for myself like 'Seat all
day', it's like I want to use time in that time very useful. Like I can work,
meditation or just eat (without phone), take a shower without music."

"I just realize when I increase time (10m per day), and in that time I just
focus to working, it's not helpful. It make me feel tired, but a day it's not
means just working, it's means a fight with yourself, without phone, without
sleeping when you want (cause I use phone and sleep as a thing to run away from
reality)."

Today he runs this on the countdown timer and the pomodoro of the site-blocker
extension, which he no longer wants to use. Orbit takes over both.

So Stay measures time not spent running away, not time spent working. What he
does inside it is free. The ramp of +10 minutes a day is dropped; a level
chosen for the day replaces it.

## Stay

### Level

One level per day: **6h** (out a lot), **8h** (hanging out), **12h** (home all
day). The default for a new day is 8h.

- Before Start the level can be changed freely.
- After Start it can only go down (plans changed, he has to go out). Going
  down to or below the time already stayed ends the day as done.
- After done the level is locked.

### Countdown

Stay counts down from the level to zero. Start, then Pause and Resume as often
as needed. It reaches zero only by running.

Pause asks why, with two choices:

- **Escape**: phone, or sleep to run away. Adds one to the day's escape count.
- **Out**: going out. Not counted.

There is no auto-detection: he pauses himself ("it base on me"). The time
paused as Out is summed and shown as "out". Time paused as Escape is not
shown separately.

At zero: the day is done, the `rest-start` sound plays once, a toast says
"Stay done. 8h, 2 escapes."

### Day boundary

A day is a calendar date in the user's timezone (`User.timezone`, as
Discipline uses). At midnight the running day closes with what was stayed and
its escapes, not done if it did not reach zero. The new day starts not started
at the default level; it does not carry over a running countdown.

### No editing

Past days are read-only. A forgotten pause cannot be corrected after the fact.

## Pomodoro

Independent of Stay: it runs, pauses and stops on its own, whether Stay is
running, paused or not started.

- Presets **25 / 5** and **50 / 10**, plus **Custom** (focus 1-120 minutes,
  rest 1-60 minutes, the site-blocker clamps). The choice is saved per user and
  is the default next time.
- The preset can be changed only while stopped.
- Cycle: focus, rest, focus, ... until Stop. Start, Pause/Resume, Stop.
- Focus start plays `work-start`, rest start plays `rest-start`, as in
  site-blocker.
- A round is one finished focus phase. Rounds are counted per day and shown
  ("3 rounds today"). No other pomodoro history.

## Timing and sound

Both timers are stored on the server per user, as timestamps, so closing the
tab or switching device keeps the right time. The client computes the display
from the stored state; the server is the authority on transitions it is asked
to make (pause, resume, level change, stop).

Pomodoro phases advance from the timestamps even while no tab is open: opening
Orbit later shows the phase it is in now. Rounds that passed while closed
count.

Sounds play only while an Orbit tab is open (a web app cannot play otherwise).
A phase or Stay end that happens while closed plays nothing.

Sound files: `work-start.wav` and `rest-start.wav`, copied from
`site-blocker/public/sounds/`.

## UI

Follows `DESIGN.md`. The mockup is the reference.

### Entry points

- **Desktop header**: a chip before the icon buttons.
  - Stay not started: "Stay".
  - Running or paused: the remaining time and, when above zero, the escape
    count in the escape color.
  - Done: "8h done".
  - While the pomodoro runs, a second part of the same chip shows its time.
  - Each part opens the modal on its tab.
- **Mobile**: the header stays as it is (logo and menu).
  - The menu gains two items, Stay and Pomodoro, each with its time when
    running.
  - While either runs or is paused, a slim strip sits under the header with
    each running timer and the escape count. Tapping it opens the modal.

### Modal

One modal with two tabs, **Stay** and **Pomodoro**, each tab with a state dot.
Desktop: centered modal. Mobile: full screen, no blur (as other modals).

Stay tab, top to bottom:

1. Level as a segmented control (6h / 8h / 12h) and its one-line meaning.
2. A circular timer: thin ring, remaining time in the middle, state under it
   (of 8h / staying / escaped / out / 8h stayed).
3. One line: "3h 12m stayed · 2 escapes · 40m out".
4. Action: Start; while running, Pause, which turns into the Escape / Out
   choice with "Keep staying"; while paused, Resume; nothing when done.
5. This week (Monday to today): one column per day, filled by the share of the
   level stayed, the escape count above it, "N of 7 reached".

Pomodoro tab: presets as a segmented control (Custom opens two number
inputs), "N rounds today", the circular timer (focus / rest / paused), Start,
then Pause/Resume and Stop.

### Colors

Navy accent `#5E6AD2` for running and progress. State colors are low-chroma,
same lightness band, chosen to sit next to the navy; they are added to `@theme`
in `index.css` as tokens:

| Token | Hex | Use |
|---|---|---|
| `escape` | `#C98A7E` | escape count, Escape choice, escaped state |
| `pause` | `#B8A77F` | paused ring and dot |
| `done` | `#8FAE9B` | done ring, reached week column, pomodoro rest |

No gradients, no glow. Tailwind default red/amber/emerald are not used here.

### Language

English and Vietnamese strings in `locales/en.json` and `vi.json`. The names
Stay, Escape, Out and Pomodoro stay in English in both languages; the rest is
translated.

## Data

`StayDay`, one document per `(userId, date)`:

- `date` `YYYY-MM-DD` (user timezone), `level` (6, 8 or 12).
- `status`: `idle | running | paused | done`.
- `stayedMs` up to the last transition, `runningSince` (when running).
- `pausedAs`: `escape | out` (when paused), `pausedSince`.
- `escapes`, `outMs`.
- `levelChanges`: `[{ at, from, to }]`.
- `doneAt`.

`Pomodoro`, one document per user:

- `workMin`, `restMin`.
- `phase`: `idle | work | rest`, `phaseStartedAt`, `pausedAt`, `pausedMs`.
- `roundsByDate`: map `YYYY-MM-DD` to a count (kept for the current week).

Export/import includes `StayDay` and the pomodoro settings; import without
them leaves them empty.

## Glossary

Add to `GLOSSARY.md`:

- **Stay**: the daily countdown of time not spent running away. _Avoid_:
  seat, work time, focus.
- **Level**: the hours Stay asks of a day: 6, 8 or 12.
- **Escape**: a pause to run away (phone, sleep). Counted.
- **Out**: a pause to go out. Not counted.

## Out of scope

- Push notifications or a PWA, for sound when the tab is closed.
- Linking Stay to Discipline. They stay separate (owner: "Okay so seperate
  stay, don't need connect it together"); a manual habit can stay in
  Discipline.
- Wall-clock alarms from site-blocker.
- Removing the site-blocker extension.

## Proof

- Backend tests: countdown from timestamps across pause/resume; escape and out
  accounting; level down below stayed ends the day; level up refused after
  Start; midnight close in the user's timezone; pomodoro phases and rounds
  advanced from timestamps across a closed period; preset change refused while
  running.
- Frontend: the modal and chip checked in the browser on desktop and mobile
  widths against the mockup.
