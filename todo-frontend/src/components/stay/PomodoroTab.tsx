import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNow } from "@/hooks/useStay";
import { usePomodoro } from "@/hooks/usePomodoro";
import { formatClock } from "@/lib/stayClock";
import {
  POMODORO_PRESETS,
  REST_RANGE,
  WORK_RANGE,
  clamp,
  pomodoroPaused,
  pomodoroProgress,
  pomodoroRemainingMs,
  presetIndex,
} from "@/lib/pomodoroClock";
import { TimerRing, type LabelTone, type RingColor } from "@/components/stay/TimerRing";

const CUSTOM = POMODORO_PRESETS.length;

export function PomodoroTab() {
  const { t } = useTranslation();
  const pomo = usePomodoro();
  const [customOpen, setCustomOpen] = useState(false);
  const [workInput, setWorkInput] = useState("");
  const [restInput, setRestInput] = useState("");

  const p = pomo.state;
  const paused = p != null && pomodoroPaused(p);
  const now = useNow(pomo.offsetMs, p != null && p.phase !== "idle" && !paused);

  // Custom is a stopped-only panel. If the timer starts elsewhere (another
  // device), drop it so it does not reopen after Stop. Only act once loaded.
  const phase = p?.phase;
  useEffect(() => {
    if (phase != null && phase !== "idle") setCustomOpen(false);
  }, [phase]);

  if (!p) return <div className="h-80" aria-busy="true" />;

  const idle = p.phase === "idle";
  const current = presetIndex(p.workMin, p.restMin);
  // The Custom panel only exists while stopped; never let it highlight a running timer.
  const customShown = customOpen && idle;

  const pickPreset = (i: number) => {
    if (!idle) return;
    if (i === CUSTOM) {
      if (!customOpen) {
        setWorkInput(String(p.workMin));
        setRestInput(String(p.restMin));
      }
      setCustomOpen((open) => !open);
      return;
    }
    setCustomOpen(false);
    const [workMin, restMin] = POMODORO_PRESETS[i];
    if (workMin !== p.workMin || restMin !== p.restMin) {
      pomo.saveSettings.mutate({ workMin, restMin });
    }
  };

  const applyCustom = () => {
    // A blank or 0 field means "keep the current value", not 1 minute.
    const workMin = clamp(Number(workInput) || p.workMin, WORK_RANGE.min, WORK_RANGE.max, p.workMin);
    const restMin = clamp(Number(restInput) || p.restMin, REST_RANGE.min, REST_RANGE.max, p.restMin);
    setWorkInput(String(workMin));
    setRestInput(String(restMin));
    setCustomOpen(false);
    pomo.saveSettings.mutate({ workMin, restMin });
  };

  const color: RingColor = paused ? "pause" : p.phase === "rest" ? "done" : "accent";
  const tone: LabelTone = paused ? "pause" : p.phase === "rest" ? "done" : "default";
  const label = idle
    ? t("pomodoro.idleLabel", { work: p.workMin, rest: p.restMin })
    : paused
      ? t("pomodoro.paused")
      : p.phase === "work"
        ? t("pomodoro.phaseFocus")
        : t("pomodoro.phaseRest");

  const segBase = "flex-1 py-[7px] rounded-[7px] text-[13px] transition-colors disabled:cursor-not-allowed";
  const segClass = (on: boolean) =>
    on
      ? `${segBase} bg-bg-elevated text-white`
      : `${segBase} text-text-tertiary hover:text-text-secondary disabled:text-text-faint disabled:hover:text-text-faint`;

  const inputClass =
    "w-14 bg-bg-surface border border-border-default rounded-lg text-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40";

  return (
    <div>
      <div className="flex bg-bg-surface border border-border-subtle rounded-[10px] p-[3px]">
        {POMODORO_PRESETS.map(([w, r], i) => (
          <button
            key={i}
            type="button"
            disabled={!idle}
            aria-pressed={current === i && !customShown}
            onClick={() => pickPreset(i)}
            className={segClass(current === i && !customShown)}
          >
            {w} / {r}
          </button>
        ))}
        <button
          type="button"
          disabled={!idle}
          aria-pressed={current === CUSTOM || customShown}
          onClick={() => pickPreset(CUSTOM)}
          className={segClass(current === CUSTOM || customShown)}
        >
          {current === CUSTOM ? `${p.workMin} / ${p.restMin}` : t("pomodoro.custom")}
        </button>
      </div>

      {customShown && (
        <div className="flex items-center justify-center gap-2 mt-2.5 text-xs text-text-muted">
          <label className="flex items-center gap-2">
            {t("pomodoro.focus")}
            <input
              type="number"
              inputMode="numeric"
              min={WORK_RANGE.min}
              max={WORK_RANGE.max}
              value={workInput}
              onChange={(e) => setWorkInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyCustom()}
              className={inputClass}
            />
          </label>
          <span>{t("pomodoro.minShort")}</span>
          <span aria-hidden="true">·</span>
          <label className="flex items-center gap-2">
            {t("pomodoro.rest")}
            <input
              type="number"
              inputMode="numeric"
              min={REST_RANGE.min}
              max={REST_RANGE.max}
              value={restInput}
              onChange={(e) => setRestInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyCustom()}
              className={inputClass}
            />
          </label>
          <span>{t("pomodoro.minShort")}</span>
          <button
            type="button"
            onClick={applyCustom}
            disabled={pomo.busy}
            className="rounded-lg bg-bg-elevated border border-border-default text-text-secondary px-3 py-1.5 text-xs"
          >
            {t("pomodoro.set")}
          </button>
        </div>
      )}

      <p className="text-xs text-text-muted text-center mt-2 min-h-[17px]">
        {t("pomodoro.rounds", { count: p.roundsToday })}
      </p>

      <TimerRing
        fraction={pomodoroProgress(p, now)}
        color={color}
        time={formatClock(pomodoroRemainingMs(p, now), false)}
        label={label}
        labelTone={tone}
        dim={idle}
      />

      {idle ? (
        <button
          type="button"
          disabled={pomo.busy}
          onClick={() => {
            setCustomOpen(false); // an unsaved Custom panel must not reopen after Stop
            pomo.start.mutate();
          }}
          className="w-full mt-[18px] rounded-xl bg-accent-primary hover:bg-accent-hover text-white font-semibold py-3 transition-colors disabled:opacity-50"
        >
          {t("pomodoro.start")}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2 mt-[18px]">
          {paused ? (
            <button
              type="button"
              disabled={pomo.busy}
              onClick={() => pomo.resume.mutate()}
              className="rounded-xl bg-accent-primary hover:bg-accent-hover text-white font-semibold py-3 transition-colors disabled:opacity-50"
            >
              {t("pomodoro.resume")}
            </button>
          ) : (
            <button
              type="button"
              disabled={pomo.busy}
              onClick={() => pomo.pause.mutate()}
              className="rounded-xl border border-border-strong text-text-secondary font-semibold py-3 hover:bg-border-subtle transition-colors disabled:opacity-50"
            >
              {t("pomodoro.pause")}
            </button>
          )}
          <button
            type="button"
            disabled={pomo.busy}
            onClick={() => pomo.stop.mutate()}
            className="rounded-xl border border-border-strong text-text-secondary font-semibold py-3 hover:bg-border-subtle transition-colors disabled:opacity-50"
          >
            {t("pomodoro.stop")}
          </button>
        </div>
      )}
    </div>
  );
}
