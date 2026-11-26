import { test, expect, beforeEach, afterEach } from "bun:test";
import { playSoundRepeated, stopRepeatedSound } from "./sounds.js";

class FakeAudio {
  static all: FakeAudio[] = [];
  currentTime = 0;
  plays = 0;
  pauses = 0;
  onended: (() => void) | null = null;
  constructor(public src: string) {
    FakeAudio.all.push(this);
  }
  play() {
    this.plays++;
    return Promise.resolve();
  }
  pause() {
    this.pauses++;
  }
  /** The browser fires this when a play reaches its end. */
  end() {
    this.onended?.();
  }
}

interface Pending {
  id: number;
  fn: () => void;
  ms: number;
}

const real = { Audio: globalThis.Audio, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
let pending: Pending[] = [];
let nextId = 1;

beforeEach(() => {
  FakeAudio.all = [];
  pending = [];
  (globalThis as unknown as { Audio: unknown }).Audio = FakeAudio;
  (globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void, ms: number) => {
    const id = nextId++;
    pending.push({ id, fn, ms });
    return id;
  };
  (globalThis as unknown as { clearTimeout: unknown }).clearTimeout = (id: number) => {
    pending = pending.filter((p) => p.id !== id);
  };
});

afterEach(() => {
  stopRepeatedSound();
  globalThis.Audio = real.Audio;
  globalThis.setTimeout = real.setTimeout;
  globalThis.clearTimeout = real.clearTimeout;
});

/** Finish the current play and run the gap timer it scheduled. */
function finishPlayAndWait(audio: FakeAudio) {
  audio.end();
  const gap = pending.shift();
  gap?.fn();
  return gap;
}

test("plays 5 times, each after a 300 ms gap, then stops", () => {
  playSoundRepeated("rest-start", 5, 300);
  expect(FakeAudio.all).toHaveLength(1);
  const audio = FakeAudio.all[0];
  expect(audio.src).toBe("/sounds/rest-start.wav");
  expect(audio.plays).toBe(1);

  for (let play = 1; play < 5; play++) {
    audio.end();
    expect(pending).toHaveLength(1);
    expect(pending[0].ms).toBe(300);
    pending.shift()!.fn();
    expect(audio.plays).toBe(play + 1);
  }
  // The 5th play ended: no 6th play is scheduled.
  finishPlayAndWait(audio);
  expect(audio.plays).toBe(5);
  expect(pending).toHaveLength(0);
});

test("stop pauses the audio and cancels the pending play", () => {
  playSoundRepeated("rest-start", 5, 300);
  const audio = FakeAudio.all[0];
  audio.end(); // gap timer now pending
  expect(pending).toHaveLength(1);

  stopRepeatedSound();
  expect(pending).toHaveLength(0);
  expect(audio.pauses).toBe(1);
  expect(audio.currentTime).toBe(0);
  expect(audio.onended).toBeNull();
  audio.end();
  expect(pending).toHaveLength(0);
  expect(audio.plays).toBe(1);
});

test("a stale gap timer does nothing after stop", () => {
  playSoundRepeated("rest-start", 5, 300);
  const audio = FakeAudio.all[0];
  audio.end();
  const stale = pending[0];
  stopRepeatedSound();
  stale.fn();
  expect(audio.plays).toBe(1);
});

test("a new call replaces a running one", () => {
  playSoundRepeated("rest-start", 5, 300);
  playSoundRepeated("rest-start", 5, 300);
  const [first, second] = FakeAudio.all;
  expect(first.pauses).toBe(1);
  expect(second.plays).toBe(1);
  first.end();
  expect(pending).toHaveLength(0);
});

test("stop with nothing playing is a no-op", () => {
  stopRepeatedSound();
  expect(FakeAudio.all).toHaveLength(0);
});
