export type SoundName = "work-start" | "rest-start";

const cache: Partial<Record<SoundName, HTMLAudioElement>> = {};

/** Fire and forget; browsers may block it until the page has had a gesture. */
export function playSound(name: SoundName) {
  if (typeof Audio === "undefined") return;
  const audio = (cache[name] ??= new Audio(`/sounds/${name}.wav`));
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

interface Repeat {
  audio: HTMLAudioElement;
  timer?: ReturnType<typeof setTimeout>;
  cancelled: boolean;
}

let repeat: Repeat | null = null;

/** Stop the repeating sound at once and cancel the plays still pending. */
export function stopRepeatedSound() {
  if (!repeat) return;
  repeat.cancelled = true;
  clearTimeout(repeat.timer);
  repeat.audio.onended = null;
  repeat.audio.pause();
  repeat.audio.currentTime = 0;
  repeat = null;
}

/**
 * Play `name` `times` times, `gapMs` after each one ends. Uses its own audio
 * element so stopping it never cuts a sound played with `playSound`. A new
 * call replaces a running one.
 */
export function playSoundRepeated(name: SoundName, times: number, gapMs: number) {
  stopRepeatedSound();
  if (typeof Audio === "undefined" || times < 1) return;
  const run: Repeat = { audio: new Audio(`/sounds/${name}.wav`), cancelled: false };
  repeat = run;
  let played = 0;
  const next = () => {
    if (run.cancelled) return;
    if (played >= times) {
      run.audio.onended = null;
      if (repeat === run) repeat = null;
      return;
    }
    played++;
    run.audio.currentTime = 0;
    run.audio.play().catch(() => {});
  };
  run.audio.onended = () => {
    run.timer = setTimeout(next, gapMs);
  };
  next();
}
