import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNow } from "@/hooks/useStay";
import { useTimer } from "@/hooks/useTimer";
import { formatClock, formatHm } from "@/lib/stayClock";
import {
  TIMER_ADD_MINUTES,
  TIMER_LABEL_MAX,
  TIMER_PRESETS_MIN,
  customLengthMs,
  splitLength,
  timerPresetIndex,
  timerProgress,
  timerRemainingMs,
} from "@/lib/timerClock";
import { TimerRing, type LabelTone, type RingColor } from "@/components/stay/TimerRing";

const CUSTOM = TIMER_PRESETS_MIN.length;

const PRIMARY =
  "rounded-xl bg-accent-primary hover:bg-accent-hover text-white font-semibold py-[13px] transition-colors disabled:opacity-50";
const GHOST =
  "rounded-xl border border-border-strong text-text-secondary font-semibold py-3 hover:bg-border-subtle transition-colors disabled:opacity-50";

function presetLabel(minutes: number): string {
  return minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`;
}

/** The Timer tab: a one-off countdown with an optional label. */
export function CountdownTab() {
  const { t } = useTranslation();
  const timer = useTimer();
  // Length and label are only sent with Start, so they are drafts until then.
  const [lengthDraft, setLengthDraft] = useState<number | null>(null);
  const [labelDraft, setLabelDraft] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [hoursInput, setHoursInput] = useState("");
  const [minutesInput, setMinutesInput] = useState("");

  const s = timer.state;
  const now = useNow(timer.offsetMs, s?.status === "running");

  // Custom and the drafts are stopped-only. If the timer starts elsewhere
  // (another device), drop them so they do not reappear after Stop.
  const status = s?.status;
  useEffect(() => {
    if (status != null && status !== "stopped") {
      setCustomOpen(false);
      setLengthDraft(null);
      setLabelDraft(null);
    }
  }, [status]);

  if (!s) return <div className="h-80" aria-busy="true" />;

  const stopped = s.status === "stopped";
  // Drafts only exist while stopped; the server's last length and label are the defaults.
  const length = stopped ? (lengthDraft ?? s.lengthMs) : s.lengthMs;
  const labelText = stopped ? (labelDraft ?? s.label) : s.label;
  const current = timerPresetIndex(length);
  const customShown = customOpen && stopped;

  const pickPreset = (i: number) => {
    if (!stopped) return;
    if (i === CUSTOM) {
      if (!customOpen) {
        const { hours, minutes } = splitLength(length);
        setHoursInput(String(hours));
        setMinutesInput(String(minutes));
      }
      setCustomOpen((open) => !open);
      return;
    }
    setCustomOpen(false);
    setLengthDraft(TIMER_PRESETS_MIN[i] * 60_000);
  };

  const applyCustom = () => {
    const ms = customLengthMs(Number(hoursInput), Number(minutesInput));
    const { hours, minutes } = splitLength(ms);
    setHoursInput(String(hours));
    setMinutesInput(String(minutes));
    setLengthDraft(ms);
    setCustomOpen(false);
  };

  const start = () => {
    setCustomOpen(false); // an unapplied Custom panel must not reopen after Stop
    // Drafts are cleared on success only, so a refused start keeps the choice.
    timer.start.mutate(
      { lengthMs: length, label: labelText.trim() },
      {
        onSuccess: () => {
          setLengthDraft(null);
          setLabelDraft(null);
        },
      },
    );
  };

  const color: RingColor =
    s.status === "paused" ? "pause" : s.status === "done" ? "done" : "accent";
  const tone: LabelTone =
    s.status === "paused" ? "pause" : s.status === "done" ? "done" : "default";
  const stateWord = t(`timer.state.${s.status}`);
  const ringLabel = s.label || stateWord;

  const segBase = "flex-1 py-[7px] rounded-[7px] text-xs whitespace-nowrap transition-colors disabled:cursor-not-allowed";
  const segClass = (on: boolean) =>
    on
      ? `${segBase} bg-bg-elevated text-white disabled:text-text-faint`
      : `${segBase} text-text-tertiary hover:text-text-secondary disabled:text-text-faint disabled:hover:text-text-faint`;
  const inputClass =
    "w-14 bg-bg-surface border border-border-default rounded-lg text-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40";

  const adds = (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {TIMER_ADD_MINUTES.map((m) => (
        <button
          key={m}
          type="button"
          disabled={timer.busy}
          onClick={() => timer.add.mutate(m * 60_000)}
          className="rounded-[10px] bg-bg-surface border border-border-default text-text-secondary hover:bg-bg-elevated py-[9px] text-[13px] transition-colors disabled:opacity-50"
        >
          {t("timer.add", { minutes: m })}
        </button>
      ))}
    </div>
  );

  return (
    <div className="text-sm font-medium">
      <div className="flex bg-bg-surface border border-border-subtle rounded-[10px] p-[3px]">
        {TIMER_PRESETS_MIN.map((m, i) => (
          <button
            key={m}
            type="button"
            disabled={!stopped}
            aria-pressed={current === i && !customShown}
            onClick={() => pickPreset(i)}
            className={segClass(current === i && !customShown)}
          >
            {presetLabel(m)}
          </button>
        ))}
        <button
          type="button"
          disabled={!stopped}
          aria-pressed={current === CUSTOM || customShown}
          onClick={() => pickPreset(CUSTOM)}
          className={segClass(current === CUSTOM || customShown)}
        >
          {current === CUSTOM ? formatHm(length) : t("timer.custom")}
        </button>
      </div>

      {customShown && (
        <div className="flex items-center justify-center gap-2 mt-2.5 text-xs text-text-muted">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={24}
            aria-label={t("timer.hours")}
            value={hoursInput}
            onChange={(e) => setHoursInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyCustom()}
            className={inputClass}
          />
          <span>{t("timer.hoursShort")}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            aria-label={t("timer.minutes")}
            value={minutesInput}
            onChange={(e) => setMinutesInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyCustom()}
            className={inputClass}
          />
          <span>{t("timer.minShort")}</span>
          <button
            type="button"
            onClick={applyCustom}
            className="rounded-lg bg-bg-elevated border border-border-default text-text-secondary px-3 py-1.5 text-xs"
          >
            {t("timer.set")}
          </button>
        </div>
      )}

      <input
        type="text"
        maxLength={TIMER_LABEL_MAX}
        disabled={!stopped}
        value={labelText}
        onChange={(e) => setLabelDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && stopped && !timer.busy && start()}
        placeholder={t("timer.labelPlaceholder")}
        aria-label={t("timer.labelPlaceholder")}
        className="w-full mt-2.5 bg-bg-surface border border-border-default rounded-[10px] text-white px-3 py-[9px] text-[13px] placeholder:text-text-muted disabled:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
      />

      <TimerRing
        fraction={timerProgress(s, now)}
        color={color}
        time={formatClock(stopped ? length : timerRemainingMs(s, now))}
        label={ringLabel}
        labelTone={tone}
        dim={stopped}
      />

      {s.status === "stopped" && (
        <button
          type="button"
          disabled={timer.busy}
          onClick={start}
          className={`w-full mt-[18px] ${PRIMARY}`}
        >
          {t("timer.start")}
        </button>
      )}
      {(s.status === "running" || s.status === "paused") && (
        <>
          <div className="grid grid-cols-2 gap-2 mt-[18px]">
            {s.status === "paused" ? (
              <button
                type="button"
                disabled={timer.busy}
                onClick={() => timer.resume.mutate()}
                className={PRIMARY}
              >
                {t("timer.resume")}
              </button>
            ) : (
              <button
                type="button"
                disabled={timer.busy}
                onClick={() => timer.pause.mutate()}
                className={GHOST}
              >
                {t("timer.pause")}
              </button>
            )}
            <button
              type="button"
              disabled={timer.busy}
              onClick={() => timer.stop.mutate()}
              className={GHOST}
            >
              {t("timer.stop")}
            </button>
          </div>
          {adds}
        </>
      )}
      {s.status === "done" && (
        <button
          type="button"
          disabled={timer.busy}
          onClick={() => timer.dismiss.mutate()}
          className={`w-full mt-[18px] ${PRIMARY}`}
        >
          {t("timer.dismiss")}
        </button>
      )}
    </div>
  );
}
