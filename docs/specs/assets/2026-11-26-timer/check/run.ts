// Browser check of the countdown Timer: the real frontend (API mocked, no
// backend, no database) against the mockup, same states, desktop and mobile,
// plus the done sound proof (5 plays, Dismiss stops it, no sound on load).
//
//   bun install --cwd docs/specs/assets/2026-11-26-timer/check
//   bun run docs/specs/assets/2026-11-26-timer/check/run.ts
//
// The argument `shots` or `sound` runs one half. It starts the Vite dev server (5173)
// and a static server for the mockup (4173), writes
// <state>-<desktop|mobile>-<app|mockup>.png and sound-result.txt next to this
// file, and stops both servers. Exits non-zero if a sound check fails.
import { chromium, type Browser, type Page } from "playwright";
import { join, resolve } from "node:path";
import { writeFileSync } from "node:fs";

const here = import.meta.dir;
const root = resolve(here, "../../../../..");
const APP = "http://localhost:5173";
const MOCK = "http://localhost:4173/docs/specs/assets/2026-11-26-timer/index.html";

// A Sunday, so the week has seven columns and today is the last one, as in the mockup.
const T = Date.parse("2026-11-29T10:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const H = 3_600_000;
const M = 60_000;

type StayScn = "idle" | "running" | "escaped";
type PomoScn = "idle" | "focus" | "paused";
type TStatus = "stopped" | "running" | "paused" | "done";
interface TScn {
  status: TStatus;
  label: string;
}
interface Scn {
  stay: StayScn;
  pomo: PomoScn;
  timer: TScn;
}

const LEN_MS = 10 * M;
const LEFT_MS = 7 * M + 42_000; // 7:42 left of 10 minutes, as shown in the shots

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
} as const;
type Width = keyof typeof VIEWPORTS;

// ---- app: mocked API shaped like the backend ----

function dayView(
  date: string,
  level: number,
  status: string,
  stayedMs: number,
  escapes: number,
  extra: Record<string, unknown> = {},
) {
  return {
    date,
    level,
    status,
    stayedMs,
    runningSince: null,
    pausedAs: null,
    pausedSince: null,
    escapes,
    outMs: 0,
    doneAt: null,
    closed: false,
    ...extra,
  };
}

function stayState(stay: StayScn) {
  const past = [
    dayView("2026-11-23", 12, "done", 12 * H, 0, { doneAt: iso(T - 6 * 86_400_000) }),
    dayView("2026-11-24", 8, "idle", 6.3 * H, 3, { closed: true }),
    dayView("2026-11-25", 8, "done", 8 * H, 1, { doneAt: iso(T - 4 * 86_400_000) }),
    dayView("2026-11-26", 6, "done", 6 * H, 0, { doneAt: iso(T - 3 * 86_400_000) }),
    dayView("2026-11-27", 12, "idle", 9.5 * H, 4, { closed: true }),
    dayView("2026-11-28", 8, "done", 8 * H, 2, { doneAt: iso(T - 86_400_000) }),
  ];
  const today =
    stay === "idle"
      ? dayView("2026-11-29", 8, "idle", 0, 0)
      : stay === "running"
        ? dayView("2026-11-29", 8, "running", 3.2 * H, 2, {
            runningSince: iso(T),
            outMs: 40 * M,
          })
        : dayView("2026-11-29", 8, "paused", 3.2 * H, 2, {
            pausedAs: "escape",
            pausedSince: iso(T),
            outMs: 40 * M,
          });
  return { serverNow: iso(T), today, week: [...past, today] };
}

function pomodoroState(p: PomoScn) {
  const base = {
    serverNow: iso(T),
    workMin: 25,
    restMin: 5,
    phase: "idle",
    phaseStartedAt: null as string | null,
    pausedAt: null,
    pausedMs: 0,
    roundsToday: 3,
  };
  if (p === "focus") return { ...base, phase: "work", phaseStartedAt: iso(T - 7 * M - 28_000) };
  if (p === "paused") {
    return { ...base, phase: "work", phaseStartedAt: iso(T - 7 * M - 28_000), pausedAt: iso(T) };
  }
  return base;
}

/** The Timer API with the rules of todo-backend/src/services/timerLogic.ts. */
interface TimerData {
  lengthMs: number;
  label: string;
  status: TStatus;
  endsAt: number | null;
  remainingMs: number | null;
  doneAt: number | null;
}
const MAX_TIMER_MS = 86_400_000;

function timerFrom(tt: TScn, now: number): TimerData {
  const base: TimerData = {
    lengthMs: LEN_MS,
    label: tt.label,
    status: tt.status,
    endsAt: null,
    remainingMs: null,
    doneAt: null,
  };
  if (tt.status === "running") base.endsAt = now + LEFT_MS;
  if (tt.status === "paused") base.remainingMs = LEFT_MS;
  if (tt.status === "done") base.doneAt = now;
  if (tt.status === "stopped") base.label = "";
  return base;
}

class TimerServer {
  constructor(
    private now: () => number,
    public t: TimerData,
  ) {}

  private settle() {
    const t = this.t;
    if (t.status === "running" && t.endsAt !== null && t.endsAt <= this.now()) {
      this.t = { ...t, status: "done", doneAt: t.endsAt, endsAt: null, remainingMs: null };
    }
  }

  view() {
    this.settle();
    const t = this.t;
    return {
      serverNow: iso(this.now()),
      lengthMs: t.lengthMs,
      label: t.label,
      status: t.status,
      endsAt: t.status === "running" && t.endsAt !== null ? iso(t.endsAt) : null,
      remainingMs: t.status === "paused" ? t.remainingMs : null,
      doneAt: t.status === "done" && t.doneAt !== null ? iso(t.doneAt) : null,
    };
  }

  /** Returns the HTTP status; on an error, the message the backend's error handler sends. */
  post(action: string, body: Record<string, unknown>): { status: number; message?: string } {
    this.settle();
    const t = this.t;
    const now = this.now();
    const conflict = (message: string) => ({ status: 409, message });
    const bad = (message: string) => ({ status: 400, message });
    switch (action) {
      case "start": {
        // Same order as startTimer: length, label, then the state.
        if (typeof body.lengthMs !== "number" || !Number.isFinite(body.lengthMs)) {
          return bad("lengthMs must be a finite number");
        }
        const length = Math.min(MAX_TIMER_MS, Math.max(60_000, Math.round(body.lengthMs)));
        const raw = body.label ?? "";
        if (typeof raw !== "string") return bad("label must be a string");
        const label = raw.trim();
        if (label.length > 40) return bad("label must be at most 40 characters");
        if (t.status !== "stopped") return conflict("Timer is not stopped");
        this.t = {
          lengthMs: length,
          label,
          status: "running",
          endsAt: now + length,
          remainingMs: null,
          doneAt: null,
        };
        return { status: 200 };
      }
      case "pause":
        if (t.status !== "running" || t.endsAt === null) return conflict("Timer is not running");
        this.t = { ...t, status: "paused", remainingMs: Math.max(0, t.endsAt - now), endsAt: null };
        return { status: 200 };
      case "resume":
        if (t.status !== "paused" || t.remainingMs === null) return conflict("Timer is not paused");
        this.t = { ...t, status: "running", endsAt: now + t.remainingMs, remainingMs: null };
        return { status: 200 };
      case "add": {
        if (typeof body.ms !== "number" || !Number.isFinite(body.ms) || body.ms <= 0) {
          return bad("ms must be a positive number");
        }
        const ms = Math.round(body.ms);
        if (t.status === "running" && t.endsAt !== null) {
          const next = Math.min(MAX_TIMER_MS, Math.max(0, t.endsAt - now) + ms);
          this.t = { ...t, endsAt: now + next };
          return { status: 200 };
        }
        if (t.status === "paused" && t.remainingMs !== null) {
          this.t = { ...t, remainingMs: Math.min(MAX_TIMER_MS, t.remainingMs + ms) };
          return { status: 200 };
        }
        return conflict("Timer is not running or paused");
      }
      case "stop":
        if (t.status !== "running" && t.status !== "paused") {
          return conflict("Timer is not running or paused");
        }
        this.t = { ...t, status: "stopped", endsAt: null, remainingMs: null, doneAt: null };
        return { status: 200 };
      case "dismiss":
        if (t.status !== "done") return conflict("Timer is not done");
        this.t = { ...t, status: "stopped", label: "", endsAt: null, remainingMs: null, doneAt: null };
        return { status: 200 };
    }
    return { status: 404, message: "not found" };
  }
}

interface Mock {
  stay: StayScn;
  pomo: PomoScn;
  timer: TimerServer;
}

async function mockApi(page: Page, mock: Mock) {
  const ok = (data: unknown) => ({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data }),
  });
  await page.route("**/api/**", (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/auth/me") {
      return route.fulfill(
        ok({
          user: {
            _id: "u1",
            username: "check",
            displayName: "Check",
            isActive: true,
            lastLogin: null,
            timezone: "UTC",
            createdAt: iso(T),
            updatedAt: iso(T),
          },
        }),
      );
    }
    if (path.startsWith("/api/timer")) {
      if (req.method() === "GET") return route.fulfill(ok(mock.timer.view()));
      const action = path.split("/")[3] ?? "";
      const res = mock.timer.post(action, req.postDataJSON() ?? {});
      if (res.status !== 200) {
        return route.fulfill({
          status: res.status,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: res.message }),
        });
      }
      return route.fulfill(ok(mock.timer.view()));
    }
    if (path.startsWith("/api/stay")) return route.fulfill(ok(stayState(mock.stay)));
    if (path.startsWith("/api/pomodoro")) return route.fulfill(ok(pomodoroState(mock.pomo)));
    if (path.startsWith("/api/days/")) {
      const items = ["Do gym", "Learn English", "Explore the world"].map((title, order) => ({
        title,
        completed: false,
        order,
      }));
      return route.fulfill(
        ok({
          dayTodo: {
            _id: "d1",
            userId: "u1",
            date: path.split("/")[3],
            items,
            createdAt: iso(T),
            updatedAt: iso(T),
          },
        }),
      );
    }
    return route.fulfill(ok({ items: [] }));
  });
}

type Open = "none" | "menu" | "timer" | "timer-custom";

/** Height of the Timer tab's preset control per `<width>-<lang>`, from every shot that shows it. */
const segHeights = new Map<string, number[]>();

async function openTimerTab(page: Page, width: Width, lang: "en" | "vi") {
  if (width === "desktop") {
    await page.locator("header button").first().click();
  } else {
    await page.getByRole("button", { name: /Open menu|Mở menu/ }).click();
    await page.waitForTimeout(300);
    const items = page.locator("div.w-64 button");
    if (lang === "en") await items.filter({ hasText: /Timer/ }).first().click();
    else await items.first().click();
  }
  await page.waitForTimeout(500);
  await page.getByRole("tab").nth(2).click();
  await page.waitForTimeout(200);
}

async function appShot(
  browser: Browser,
  file: string,
  width: Width,
  scn: Scn,
  open: Open,
  opts: { lang?: "en" | "vi"; clip?: { height: number } } = {},
) {
  const lang = opts.lang ?? "en";
  const ctx = await browser.newContext({ viewport: VIEWPORTS[width], reducedMotion: "reduce" });
  await ctx.addInitScript((l) => localStorage.setItem("lang", l), lang);
  const page = await ctx.newPage();
  // Freeze Date only (not performance.now), so the timers show the same
  // seconds as the mockup and animations still run.
  await page.addInitScript((fixed) => {
    const Real = Date;
    class Fixed extends Real {
      constructor(...args: unknown[]) {
        // @ts-expect-error spread into Date
        super(...(args.length ? args : [fixed]));
      }
      static now() {
        return fixed;
      }
    }
    // @ts-expect-error replace the global
    window.Date = Fixed;
  }, T);
  await mockApi(page, {
    stay: scn.stay,
    pomo: scn.pomo,
    timer: new TimerServer(() => T, timerFrom(scn.timer, T)),
  });
  await page.goto(APP);
  await page.locator("header").waitFor();
  await page.waitForTimeout(700);

  if (open === "menu") {
    await page.getByRole("button", { name: /Open menu|Mở menu/ }).click();
    await page.waitForTimeout(300);
  } else if (open !== "none") {
    await openTimerTab(page, width, lang);
    if (open === "timer-custom") await page.getByRole("button", { name: /Custom|Tùy/ }).click();
    await page.waitForTimeout(300);
  }

  if (open.startsWith("timer")) {
    // The preset control must keep one line of text in Vietnamese too.
    const h = await page.evaluate(
      () =>
        [...document.querySelectorAll<HTMLElement>("button")]
          .find((b) => b.textContent === "5m")!
          .parentElement!.getBoundingClientRect().height,
    );
    segHeights.set(`${width}-${lang}`, [...(segHeights.get(`${width}-${lang}`) ?? []), h]);
  }

  const overflow = await page.evaluate(() => {
    const bad: string[] = [];
    const vw = window.innerWidth;
    if (document.documentElement.scrollWidth > vw) bad.push("page scrolls horizontally");
    for (const el of document.querySelectorAll<HTMLElement>("header *, [role=tablist] *, .fixed *")) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
        bad.push(`${el.tagName} "${(el.textContent ?? "").slice(0, 30)}" off-screen`);
      }
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow === "visible" && el.children.length === 0) {
        bad.push(`${el.tagName} "${(el.textContent ?? "").slice(0, 30)}" text overflows`);
      }
    }
    return bad;
  });
  if (overflow.length) console.log(`  overflow in ${file}:`, overflow.slice(0, 5));

  const clip = opts.clip ? { x: 0, y: 0, width: VIEWPORTS[width].width, height: opts.clip.height } : undefined;
  await page.screenshot({ path: join(here, file), clip });
  await ctx.close();
}

// ---- mockup: drive its own state object ----

async function mockupShot(
  browser: Browser,
  file: string,
  width: Width,
  scn: Scn,
  open: Open,
  opts: { clip?: { height: number } } = {},
) {
  const ctx = await browser.newContext({ viewport: VIEWPORTS[width], reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(MOCK);
  await page.evaluate(
    ({ scn, width, open, leftS }) => {
      /* eslint-disable */
      // The mockup's state is top-level `let`, reachable only through global eval.
      const g = (code: string) => (0, eval)(code);
      const w = window as any;
      g("speed = 0"); // freeze the mockup clock
      w.reset();
      const s = g("s");
      if (scn.stay === "running") Object.assign(s, { status: "running", remaining: 8 * 3600 - 11520, esc: 2, out: 2400 });
      if (scn.stay === "escaped") {
        Object.assign(s, { status: "paused", why: "escape", remaining: 8 * 3600 - 11520, esc: 2, out: 2400 });
      }
      if (scn.pomo === "paused") Object.assign(s.p, { phase: "work", left: 1052, rounds: 3, paused: true });
      else if (scn.pomo === "focus") Object.assign(s.p, { phase: "work", left: 1052, rounds: 3 });
      else s.p.rounds = 3;
      const tt = scn.timer;
      if (tt.status !== "stopped") {
        Object.assign(s.t, {
          status: tt.status,
          label: tt.label,
          left: tt.status === "done" ? 0 : leftS,
        });
      }
      w.setMobile(width === "mobile");
      document.querySelector<HTMLElement>(".demo")!.style.display = "none";
      if (open === "menu") w.menu.classList.add("open");
      if (open.startsWith("timer")) w.openModal("timer");
      if (open === "timer-custom") g("tCustomOpen = true");
      w.render();
    },
    { scn, width, open, leftS: LEFT_MS / 1000 },
  );
  await page.waitForTimeout(300);
  const clip = opts.clip ? { x: 0, y: 0, width: VIEWPORTS[width].width, height: opts.clip.height } : undefined;
  await page.screenshot({ path: join(here, file), clip });
  await ctx.close();
}

// ---- states ----

const stopped: TScn = { status: "stopped", label: "" };
const runLabel: TScn = { status: "running", label: "Tea" };
const run: TScn = { status: "running", label: "" };
const paused: TScn = { status: "paused", label: "" };
const done: TScn = { status: "done", label: "" };
const doneLabel: TScn = { status: "done", label: "Tea" };

const alone = (timer: TScn): Scn => ({ stay: "idle", pomo: "idle", timer });
const withOthers = (timer: TScn): Scn => ({ stay: "running", pomo: "focus", timer });

interface Shot {
  name: string;
  scn: Scn;
  open: Open;
  widths: Width[];
  clip?: Partial<Record<Width, number>>;
  /** Vietnamese shots are app only; the mockup is English. */
  lang?: "en" | "vi";
}
const SHOTS: Shot[] = [
  // The Timer tab.
  { name: "timer-stopped", scn: alone(stopped), open: "timer", widths: ["desktop", "mobile"] },
  { name: "timer-custom", scn: alone(stopped), open: "timer-custom", widths: ["desktop", "mobile"] },
  { name: "timer-running-label", scn: alone(runLabel), open: "timer", widths: ["desktop", "mobile"] },
  { name: "timer-running", scn: alone(run), open: "timer", widths: ["desktop", "mobile"] },
  { name: "timer-paused", scn: alone(paused), open: "timer", widths: ["desktop", "mobile"] },
  { name: "timer-done", scn: alone(done), open: "timer", widths: ["desktop", "mobile"] },
  // Desktop header chip, timer part alone and next to Stay and Pomodoro.
  { name: "chip-timer-running", scn: alone(run), open: "none", widths: ["desktop"], clip: { desktop: 80 } },
  { name: "chip-timer-paused", scn: alone(paused), open: "none", widths: ["desktop"], clip: { desktop: 80 } },
  { name: "chip-timer-done", scn: alone(done), open: "none", widths: ["desktop"], clip: { desktop: 80 } },
  { name: "chip-timer-running-with", scn: withOthers(run), open: "none", widths: ["desktop"], clip: { desktop: 80 } },
  { name: "chip-timer-done-with", scn: withOthers(done), open: "none", widths: ["desktop"], clip: { desktop: 80 } },
  // Mobile menu.
  { name: "menu-timer-running", scn: withOthers(run), open: "menu", widths: ["mobile"], clip: { mobile: 560 } },
  { name: "menu-timer-done", scn: alone(done), open: "menu", widths: ["mobile"], clip: { mobile: 560 } },
  // Mobile strip.
  { name: "strip-timer-running", scn: alone(run), open: "none", widths: ["mobile"], clip: { mobile: 140 } },
  { name: "strip-timer-running-label", scn: alone(runLabel), open: "none", widths: ["mobile"], clip: { mobile: 140 } },
  { name: "strip-timer-paused", scn: alone(paused), open: "none", widths: ["mobile"], clip: { mobile: 140 } },
  { name: "strip-timer-done", scn: alone(done), open: "none", widths: ["mobile"], clip: { mobile: 140 } },
  { name: "strip-timer-done-label", scn: alone(doneLabel), open: "none", widths: ["mobile"], clip: { mobile: 140 } },
  { name: "strip-timer-with", scn: withOthers(runLabel), open: "none", widths: ["mobile"], clip: { mobile: 140 } },
  { name: "strip-timer-with-esc", scn: { stay: "escaped", pomo: "focus", timer: runLabel }, open: "none", widths: ["mobile"], clip: { mobile: 140 } },
  // Vietnamese, app only.
  { name: "timer-vi", scn: alone(runLabel), open: "timer", widths: ["desktop", "mobile"], lang: "vi" },
  { name: "chip-timer-vi", scn: withOthers(done), open: "none", widths: ["desktop"], clip: { desktop: 80 }, lang: "vi" },
  { name: "menu-timer-vi", scn: withOthers(run), open: "menu", widths: ["mobile"], clip: { mobile: 560 }, lang: "vi" },
];

// ---- sound proof (app only, real clock) ----

const results: string[] = [];
let failed = false;
function report(ok: boolean, line: string) {
  results.push(`${ok ? "PASS" : "FAIL"} ${line}`);
  console.log(results[results.length - 1]);
  if (!ok) failed = true;
}
function info(line: string) {
  results.push(`     ${line}`);
  console.log(results[results.length - 1]);
}

interface AudioEvent {
  e: "play" | "pause" | "ended";
  src: string;
  t: number;
}

async function soundPage(browser: Browser, server: TimerServer) {
  const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop, reducedMotion: "reduce" });
  await ctx.addInitScript(() => localStorage.setItem("lang", "en"));
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const rec: unknown[] = ((window as any).__audio = []);
    const P = HTMLMediaElement.prototype;
    const play = P.play;
    const pause = P.pause;
    // The audio element is never in the DOM, so `ended` does not reach window:
    // listen on each element the first time it plays.
    const seen = new WeakSet<HTMLMediaElement>();
    P.play = function (this: HTMLMediaElement) {
      if (!seen.has(this)) {
        seen.add(this);
        this.addEventListener("ended", () =>
          rec.push({ e: "ended", src: this.src, t: performance.now() }),
        );
      }
      rec.push({ e: "play", src: this.src, t: performance.now() });
      return play.call(this);
    };
    P.pause = function (this: HTMLMediaElement) {
      rec.push({ e: "pause", src: this.src, t: performance.now() });
      return pause.call(this);
    };
  });
  await mockApi(page, { stay: "idle", pomo: "idle", timer: server });
  return { ctx, page };
}

const audioLog = (page: Page) =>
  page.evaluate(() => ((window as any).__audio as AudioEvent[]).filter((x) => x.src.endsWith("rest-start.wav")));
const count = (log: AudioEvent[], e: AudioEvent["e"]) => log.filter((x) => x.e === e).length;

function runningSoon(leadMs: number): TimerServer {
  return new TimerServer(Date.now, {
    lengthMs: LEN_MS,
    label: "",
    status: "running",
    endsAt: Date.now() + leadMs,
    remainingMs: null,
    doneAt: null,
  });
}

async function soundChecks(browser: Browser) {
  // 1. Reaches zero with Orbit open: 5 plays, gaps of 300 ms or more, toast, Dismiss, chip "Done".
  {
    const server = runningSoon(8000);
    const { ctx, page } = await soundPage(browser, server);
    await page.goto(APP);
    await page.locator("header").waitFor();
    const toast = page.getByText(/^Timer done\.$/);
    await toast.waitFor({ timeout: 20_000 });
    report(true, "1 toast 'Timer done.' appeared");
    // 5 plays of the clip, then wait well past where a 6th would start.
    await page
      .waitForFunction(
        () => ((window as any).__audio as AudioEvent[]).filter((x) => x.e === "ended").length >= 5,
        undefined,
        { timeout: 90_000, polling: 100 },
      )
      .catch(async (err) => {
        info(`1 audio log at timeout: ${JSON.stringify(await page.evaluate(() => (window as any).__audio))}`);
        throw err;
      });
    await page.waitForTimeout(4000);
    const log = await audioLog(page);
    const plays = log.filter((x) => x.e === "play");
    const ends = log.filter((x) => x.e === "ended");
    report(plays.length === 5, `1 rest-start.wav played exactly 5 times (plays=${plays.length}, ended=${ends.length})`);
    const gaps = plays.slice(1).map((p, i) => p.t - ends[i].t);
    info(`1 gaps between end and next start (ms): ${gaps.map((g) => g.toFixed(0)).join(", ")}`);
    report(gaps.length === 4 && gaps.every((g) => g >= 300), "1 every gap is 300 ms or more");
    const chip = await page.locator("header").getByText("Done", { exact: true }).count();
    report(chip > 0, "1 header chip shows 'Done'");
    await page.locator("header button").first().click();
    await page.getByRole("tab").nth(2).click();
    report(await page.getByRole("button", { name: "Dismiss" }).isVisible(), "1 Timer tab shows Dismiss");
    await ctx.close();
  }

  // 2. Dismiss after the 2nd play: pause at once, no further play.
  {
    const server = runningSoon(9000);
    const { ctx, page } = await soundPage(browser, server);
    await page.goto(APP);
    await page.locator("header").waitFor();
    await page.locator("header button").first().click();
    await page.getByRole("tab").nth(2).click();
    const lengthBefore = server.t.lengthMs;
    await page.waitForFunction(
      () =>
        ((window as any).__audio as AudioEvent[]).filter(
          (x) => x.e === "play" && x.src.endsWith("rest-start.wav"),
        ).length >= 2,
      undefined,
      { timeout: 90_000, polling: 25 },
    );
    const dismiss = page.getByRole("button", { name: "Dismiss" });
    await dismiss.waitFor({ timeout: 5000 });
    const before = await page.evaluate(() => performance.now());
    await dismiss.click();
    const after = await page.evaluate(() => performance.now());
    await page.waitForTimeout(15_000); // past where plays 3 to 5 would have been
    const log = await audioLog(page);
    const plays = log.filter((x) => x.e === "play");
    const pauses = log.filter((x) => x.e === "pause" && x.t >= plays[1].t);
    const pauseDelay = pauses.length ? pauses[0].t - before : Number.NaN;
    info(`2 click ${before.toFixed(0)}-${after.toFixed(0)} ms, pause at ${pauses[0]?.t.toFixed(0)} ms (${pauseDelay.toFixed(0)} ms after the click began)`);
    report(plays.length === 2, `2 no play after Dismiss (plays=${plays.length})`);
    report(pauses.length > 0 && pauses[0].t >= before && pauses[0].t <= after + 50, "2 pause called on the audio at the click");
    const view = server.view();
    report(
      view.status === "stopped" && view.lengthMs === lengthBefore,
      `2 timer stopped with the same length (${view.status}, ${view.lengthMs} ms)`,
    );
    report(await page.getByRole("button", { name: "Start" }).isVisible(), "2 Timer tab shows Start again");
    await ctx.close();
  }

  // 3. Loaded already done: no play.
  {
    const server = new TimerServer(Date.now, {
      lengthMs: LEN_MS,
      label: "",
      status: "done",
      endsAt: null,
      remainingMs: null,
      doneAt: Date.now() - 60_000,
    });
    const { ctx, page } = await soundPage(browser, server);
    await page.goto(APP);
    await page.locator("header").waitFor();
    await page.locator("header").getByText("Done", { exact: true }).waitFor();
    await page.waitForTimeout(5000);
    const log = await audioLog(page);
    report(count(log, "play") === 0, `3 timer already done on load: no play (plays=${count(log, "play")})`);
    report((await page.getByText(/^Timer done/).count()) === 0, "3 no toast on load");
    await ctx.close();
  }
}

// ---- run ----

const only = process.argv[2] ?? "all";

const server = Bun.serve({
  port: 4173,
  fetch(req) {
    const path = decodeURIComponent(new URL(req.url).pathname);
    if (!path.startsWith("/docs/specs/assets/") || path.includes("..")) {
      return new Response("not found", { status: 404 });
    }
    return new Response(Bun.file(join(root, path)));
  },
});
const vite = Bun.spawn(
  ["bun", "run", "--cwd", join(root, "todo-frontend"), "dev", "--", "--port", "5173", "--strictPort"],
  { stdout: "ignore", stderr: "inherit" },
);

try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(APP)).ok) break;
    } catch {}
    if (i > 60) throw new Error("vite did not start");
    await Bun.sleep(500);
  }
  const launchArgs = ["--autoplay-policy=no-user-gesture-required"];
  let browser: Browser;
  try {
    browser = await chromium.launch({ channel: "chrome", args: launchArgs });
  } catch {
    browser = await chromium.launch({ args: launchArgs });
  }
  if (only !== "sound") {
    for (const shot of SHOTS) {
      for (const width of shot.widths) {
        const clip = shot.clip?.[width] ? { height: shot.clip[width]! } : undefined;
        console.log(`${shot.name} ${width}`);
        await appShot(browser, `${shot.name}-${width}-app.png`, width, shot.scn, shot.open, {
          clip,
          lang: shot.lang,
        });
        if (shot.lang !== "vi") {
          await mockupShot(browser, `${shot.name}-${width}-mockup.png`, width, shot.scn, shot.open, { clip });
        }
      }
    }
  }
  for (const width of ["desktop", "mobile"] as const) {
    const en = segHeights.get(`${width}-en`) ?? [];
    const vi = segHeights.get(`${width}-vi`) ?? [];
    if (!en.length || !vi.length) continue;
    const all = [...en, ...vi];
    report(
      Math.max(...all) - Math.min(...all) < 1,
      `layout: Timer preset control height ${width}, en ${en[0].toFixed(1)} px, vi ${vi[0].toFixed(1)} px (no wrapped label)`,
    );
  }
  if (only !== "shots") {
    await soundChecks(browser);
    writeFileSync(join(here, "sound-result.txt"), results.join("\n") + "\n");
  }
  await browser.close();
} finally {
  vite.kill();
  server.stop(true);
}
if (failed) process.exit(1);
