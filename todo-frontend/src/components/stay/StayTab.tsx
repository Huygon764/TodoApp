import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNow, useStay } from "@/hooks/useStay";
import {
  STAY_LEVELS,
  formatClock,
  formatHm,
  stayOutMs,
  stayRemainingMs,
  stayStayedMs,
  stayShare,
  weekColumns,
  weekReached,
} from "@/lib/stayClock";
import { TimerRing, type LabelTone, type RingColor } from "@/components/stay/TimerRing";
import type { StayLevel } from "@/types/stay";

export function StayTab() {
  const { t } = useTranslation();
  const stay = useStay();
  const [picking, setPicking] = useState(false);

  const day = stay.state?.today ?? null;
  // Ticks while running, and while paused as Out so the out time counts up.
  const ticking =
    day?.status === "running" || (day?.status === "paused" && day.pausedAs === "out");
  const now = useNow(stay.offsetMs, ticking);

  // The Escape / Out choice belongs to a running day. If the day leaves
  // running (another device paused it), drop the choice so a later resume
  // does not bring it back.
  const status = day?.status;
  useEffect(() => {
    if (status !== "running") setPicking(false);
  }, [status]);

  if (!day || !stay.state) {
    return <div className="h-80" aria-busy="true" />;
  }

  const { level } = day;
  const stayed = stayStayedMs(day, now);
  const remaining = stayRemainingMs(day, now);
  const out = stayOutMs(day, now);

  const color: RingColor = status === "paused" ? "pause" : status === "done" ? "done" : "accent";
  const escaped = status === "paused" && day.pausedAs === "escape";
  const label =
    status === "idle"
      ? t("stay.ofLevel", { level })
      : status === "running"
        ? t("stay.staying")
        : status === "done"
          ? t("stay.stayed", { level })
          : escaped
            ? t("stay.escaped")
            : t("stay.out");
  const tone: LabelTone =
    status === "done" ? "done" : escaped ? "escape" : status === "paused" ? "pause" : "default";

  const cols = weekColumns(stay.state.week, now);
  const reached = weekReached(cols);
  const weekdays = t("stay.weekdays", { returnObjects: true }) as string[];

  const choose = (reason: "escape" | "out") => {
    setPicking(false);
    stay.pause.mutate(reason);
  };
  const changeLevel = (l: StayLevel) => {
    if (l !== level) stay.setLevel.mutate(l);
  };

  return (
    <div>
      <div className="flex bg-bg-surface border border-border-subtle rounded-[10px] p-[3px]">
        {STAY_LEVELS.map((l) => {
          const disabled = stay.busy || status === "done" || (status !== "idle" && l > level);
          return (
            <button
              key={l}
              type="button"
              disabled={disabled}
              aria-pressed={l === level}
              onClick={() => changeLevel(l)}
              className={`flex-1 py-[7px] rounded-[7px] text-[13px] transition-colors disabled:cursor-not-allowed ${
                l === level
                  ? "bg-bg-elevated text-white"
                  : "text-text-tertiary hover:text-text-secondary disabled:text-text-faint disabled:hover:text-text-faint"
              }`}
            >
              {l}h
            </button>
          );
        })}
      </div>
      <p className="text-xs text-text-muted text-center mt-2 min-h-[17px]">
        {t(`stay.levelHint.${level}`)}
      </p>

      <TimerRing
        fraction={stayShare(day, now)}
        color={color}
        time={formatClock(remaining)}
        label={label}
        labelTone={tone}
        dim={status === "idle"}
      />

      <div className="flex justify-center gap-5 text-[13px] text-text-muted tabular-nums">
        <span>
          <b className="font-semibold text-text-secondary">{formatHm(stayed)}</b>{" "}
          {t("stay.metaStayed")}
        </span>
        <span>
          <b className="font-semibold text-escape">{day.escapes}</b>{" "}
          {t("stay.metaEscapes", { count: day.escapes })}
        </span>
        <span>
          <b className="font-semibold text-text-secondary">{formatHm(out)}</b>{" "}
          {t("stay.metaOut")}
        </span>
      </div>

      {picking && status === "running" ? (
        <div className="mt-[18px] grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => choose("escape")}
            disabled={stay.busy}
            className="text-left rounded-xl bg-bg-surface border border-escape/35 px-3.5 py-3 hover:bg-bg-elevated transition-colors"
          >
            <b className="block font-semibold text-escape">{t("stay.escape")}</b>
            <span className="text-xs text-text-muted">{t("stay.escapeHint")}</span>
          </button>
          <button
            type="button"
            onClick={() => choose("out")}
            disabled={stay.busy}
            className="text-left rounded-xl bg-bg-surface border border-border-default px-3.5 py-3 hover:bg-bg-elevated transition-colors"
          >
            <b className="block font-semibold text-white">{t("stay.outChoice")}</b>
            <span className="text-xs text-text-muted">{t("stay.outHint")}</span>
          </button>
          <button
            type="button"
            onClick={() => setPicking(false)}
            className="col-span-2 text-xs text-text-muted py-1 hover:text-text-secondary transition-colors"
          >
            {t("stay.keepStaying")}
          </button>
        </div>
      ) : status === "idle" ? (
        <button
          type="button"
          disabled={stay.busy}
          onClick={() => stay.start.mutate()}
          className="w-full mt-[18px] rounded-xl bg-accent-primary hover:bg-accent-hover text-white font-semibold py-3 transition-colors disabled:opacity-50"
        >
          {t("stay.start")}
        </button>
      ) : status === "running" ? (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="w-full mt-[18px] rounded-xl border border-border-strong text-text-secondary font-semibold py-3 hover:bg-border-subtle transition-colors"
        >
          {t("stay.pause")}
        </button>
      ) : status === "paused" ? (
        <button
          type="button"
          disabled={stay.busy}
          onClick={() => stay.resume.mutate()}
          className="w-full mt-[18px] rounded-xl bg-accent-primary hover:bg-accent-hover text-white font-semibold py-3 transition-colors disabled:opacity-50"
        >
          {t("stay.resume")}
        </button>
      ) : null}

      <div className="mt-[22px] pt-[18px] border-t border-border-subtle">
        <div className="flex justify-between text-xs text-text-muted mb-2.5">
          <b className="font-semibold text-[13px] text-text-secondary">{t("stay.thisWeek")}</b>
          <span>{t("stay.reached", { n: reached })}</span>
        </div>
        <div className="grid grid-cols-7 gap-2 h-[84px]">
          {cols.map((c) => (
            <div key={c.index} className="flex flex-col items-center gap-[5px]">
              <em className="not-italic text-[11px] text-escape min-h-[15px] tabular-nums">
                {c.escapes > 0 ? c.escapes : ""}
              </em>
              <div className="w-full max-w-[26px] flex-1 flex items-end bg-bg-surface rounded-md overflow-hidden">
                <i
                  className={`block w-full ${c.reached ? "bg-done" : "bg-accent-primary opacity-50"}`}
                  style={{ height: `${Math.round(c.share * 100)}%` }}
                />
              </div>
              <small
                className={`text-[11px] ${c.isToday ? "text-text-secondary" : "text-text-muted"}`}
              >
                {c.isToday ? t("stay.today") : (weekdays[c.index] ?? "")}
              </small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
