# Timer

A one-off countdown: set a length, it rings at zero. Independent of Stay and
Pomodoro (see [`stay-pomodoro.md`](stay-pomodoro.md)); one timer at a time, no
history.

## Behavior

- Length: presets 5m, 10m, 15m, 30m, 1h, or Custom (hours and minutes, 1
  minute to 24 hours). The last length used is saved per user and is the
  default next time; a length that is not a preset shows as Custom with its
  hours and minutes.
- Label: optional, up to 40 characters, shown under the ring and in the strip.
  Cleared after Dismiss.
- Length and label change only while stopped.
- Start; while running, Pause, Stop, +1m and +5m; while paused, Resume, Stop,
  +1m and +5m. Remaining time is capped at 24 hours.
- At zero the timer is done until Dismiss: `rest-start` plays 5 times with a
  300 ms gap, a toast says "Timer done." or "Timer done: <label>.", and the
  tab shows Dismiss. Dismiss stops the sound at once and returns the timer to
  stopped with the same length. Start from done is not offered.
- The sound and toast play only in an open tab that saw the countdown reach
  zero, once per zero. A timer that reached zero while Orbit was closed (or
  before a reload) is silent and simply shows done.
- Stored on the server as timestamps; the client computes the display and
  refetches at zero so the server settles it to done. Export and import do not
  carry it.

## Where it appears

- Desktop: a third part of the header chip, only while the timer runs, is
  paused or is done: the remaining time, or "Done". It opens the modal on the
  Timer tab.
- Mobile: a Timer item in the menu (its time while running or paused, "done"
  when done), and an item in the strip while it runs, is paused or is done.
- The modal's third tab, Timer, has a state dot. Ring colors: accent running,
  pause paused, done done.
