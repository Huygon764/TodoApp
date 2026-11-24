export type SoundName = "work-start" | "rest-start";

const cache: Partial<Record<SoundName, HTMLAudioElement>> = {};

/** Fire and forget; browsers may block it until the page has had a gesture. */
export function playSound(name: SoundName) {
  if (typeof Audio === "undefined") return;
  const audio = (cache[name] ??= new Audio(`/sounds/${name}.wav`));
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
