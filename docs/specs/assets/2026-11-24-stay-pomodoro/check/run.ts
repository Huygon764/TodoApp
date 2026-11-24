// Browser check of Stay and Pomodoro: the real frontend (API mocked, no backend,
// no database) against the mockup, same states, desktop and mobile.
//
//   bun install --cwd docs/specs/assets/2026-11-24-stay-pomodoro/check
//   bun run docs/specs/assets/2026-11-24-stay-pomodoro/check/run.ts
//
// It starts the Vite dev server (5173) and a static server for the mockup
// (4173), writes <state>-<desktop|mobile>-<app|mockup>.png next to this file,
// and stops both servers.
import { chromium, type Browser, type Page } from "playwright";
import { join, resolve } from "node:path";

const here = import.meta.dir;
const root = resolve(here, "../../../../..");
const APP = "http://localhost:5173";
const MOCK = "http://localhost:4173/docs/specs/assets/2026-11-24-stay-pomodoro/index.html";

// A Sunday, so the week has seven columns and today is the last one, as in the mockup.
const T = Date.parse("2026-11-29T10:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const H = 3_600_000;
const M = 60_000;

type StayScn = "idle" | "running" | "done";
type PomoScn = "idle" | "focus" | "rest";
interface Scn {
  stay: StayScn;
  pomo: PomoScn;
}

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
        : dayView("2026-11-29", 8, "done", 8 * H, 2, { outMs: 40 * M, doneAt: iso(T) });
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
    roundsToday: p === "rest" ? 4 : 3,
  };
  if (p === "focus") return { ...base, phase: "work", phaseStartedAt: iso(T - 7 * M - 28_000) };
  if (p === "rest") return { ...base, phase: "rest", phaseStartedAt: iso(T - 90_000) };
  return base;
}

async function mockApi(page: Page, scn: Scn) {
  const ok = (data: unknown) => ({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data }),
  });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
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
    if (path.startsWith("/api/stay")) return route.fulfill(ok(stayState(scn.stay)));
    if (path.startsWith("/api/pomodoro")) return route.fulfill(ok(pomodoroState(scn.pomo)));
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

type Open = "none" | "menu" | "stay" | "stay-pick" | "pomo" | "pomo-custom";

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
  await mockApi(page, scn);
  await page.goto(APP);
  await page.locator("header").waitFor();
  await page.waitForTimeout(700);

  if (open !== "none") {
    if (width === "desktop") {
      if (open !== "menu") await page.locator("header button").first().click();
    } else {
      await page.getByRole("button", { name: /Open menu/ }).click();
      await page.waitForTimeout(300);
      if (open !== "menu") {
        const label = open.startsWith("pomo") ? /Pomodoro/ : /^Stay|^\S*\s*Stay/;
        await page.locator("div.w-64 button", { hasText: label }).first().click();
      }
    }
    await page.waitForTimeout(500);
    if (open.startsWith("pomo")) {
      await page.getByRole("tab", { name: "Pomodoro" }).click();
      await page.waitForTimeout(200);
    }
    if (open === "pomo-custom") await page.getByRole("button", { name: /Custom|Tùy/ }).click();
    if (open === "stay-pick") await page.getByRole("button", { name: /^Pause$/ }).click();
    await page.waitForTimeout(300);
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
    ({ scn, width, open }) => {
      /* eslint-disable */
      // The mockup's state is top-level `let`, reachable only through global eval.
      const g = (code: string) => (0, eval)(code);
      const w = window as any;
      g("speed = 0"); // freeze the mockup clock
      w.reset();
      const s = g("s");
      if (scn.stay === "running") Object.assign(s, { status: "running", remaining: 8 * 3600 - 11520, esc: 2, out: 2400 });
      if (scn.stay === "done") Object.assign(s, { status: "done", remaining: 0, esc: 2, out: 2400 });
      if (scn.pomo === "focus") Object.assign(s.p, { phase: "work", left: 1052, rounds: 3 });
      else if (scn.pomo === "rest") Object.assign(s.p, { phase: "rest", left: 210, rounds: 4 });
      else s.p.rounds = 3;
      w.setMobile(width === "mobile");
      document.querySelector<HTMLElement>(".demo")!.style.display = "none";
      if (open === "menu") w.menu.classList.add("open");
      if (open === "stay" || open === "stay-pick") w.openModal("stay");
      if (open.startsWith("pomo")) w.openModal("pomo");
      if (open === "stay-pick") g("picking = true");
      if (open === "pomo-custom") g("customOpen = true");
      w.render();
    },
    { scn, width, open },
  );
  await page.waitForTimeout(300);
  const clip = opts.clip ? { x: 0, y: 0, width: VIEWPORTS[width].width, height: opts.clip.height } : undefined;
  await page.screenshot({ path: join(here, file), clip });
  await ctx.close();
}

// ---- run ----

const idle: Scn = { stay: "idle", pomo: "idle" };
const running: Scn = { stay: "running", pomo: "focus" };
const customScn: Scn = { stay: "running", pomo: "idle" };
const rest: Scn = { stay: "running", pomo: "rest" };
const done: Scn = { stay: "done", pomo: "idle" };

interface Shot {
  name: string;
  scn: Scn;
  open: Open;
  widths: Width[];
  clip?: Partial<Record<Width, number>>;
}
const SHOTS: Shot[] = [
  { name: "idle", scn: idle, open: "none", widths: ["desktop", "mobile"], clip: { desktop: 80, mobile: 140 } },
  { name: "running", scn: running, open: "none", widths: ["desktop", "mobile"], clip: { desktop: 80, mobile: 140 } },
  { name: "menu", scn: running, open: "menu", widths: ["mobile"], clip: { mobile: 560 } },
  { name: "stay", scn: running, open: "stay", widths: ["desktop", "mobile"] },
  { name: "stay-pick", scn: running, open: "stay-pick", widths: ["desktop", "mobile"] },
  { name: "pomo-custom", scn: customScn, open: "pomo-custom", widths: ["desktop", "mobile"] },
  { name: "pomo-rest", scn: rest, open: "pomo", widths: ["desktop", "mobile"] },
  { name: "done", scn: done, open: "stay", widths: ["desktop", "mobile"] },
];

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
  let browser: Browser;
  try {
    browser = await chromium.launch({ channel: "chrome" });
  } catch {
    browser = await chromium.launch();
  }
  for (const shot of SHOTS) {
    for (const width of shot.widths) {
      const clip = shot.clip?.[width] ? { height: shot.clip[width]! } : undefined;
      console.log(`${shot.name} ${width}`);
      await appShot(browser, `${shot.name}-${width}-app.png`, width, shot.scn, shot.open, { clip });
      await mockupShot(browser, `${shot.name}-${width}-mockup.png`, width, shot.scn, shot.open, { clip });
    }
  }
  // Vietnamese: app only (the mockup is English).
  for (const width of ["desktop", "mobile"] as const) {
    console.log(`vi ${width}`);
    await appShot(browser, `stay-vi-${width}-app.png`, width, running, "stay", { lang: "vi" });
    await appShot(browser, `pomo-vi-${width}-app.png`, width, rest, "pomo", { lang: "vi" });
  }
  await browser.close();
} finally {
  vite.kill();
  server.stop(true);
}
