import { useTranslation } from "react-i18next";
import { StateDot } from "@/components/stay/StateDot";
import { useTimerSummary } from "@/hooks/useTimerSummary";
import type { TimerTab } from "@/components/stay/StayPomodoroModal";

interface TimerEntryProps {
  onOpen: (tab: TimerTab) => void;
}

const PART =
  "flex items-center gap-[7px] px-[13px] h-full hover:bg-border-subtle transition-colors";

/** Desktop header chip: Stay part, plus a Pomodoro part while it runs. */
export function StayChip({ onOpen }: TimerEntryProps) {
  const { t } = useTranslation();
  const { stay, pomodoro, timer } = useTimerSummary();

  const stayText =
    stay.status === "idle"
      ? t("stay.name")
      : stay.status === "done"
        ? t("stay.chipDone", { level: stay.level })
        : stay.clock;

  return (
    <div className="flex items-center h-[42px] font-medium rounded-xl bg-bg-card border border-border-default hover:border-border-strong text-text-tertiary overflow-hidden transition-colors">
      <button type="button" onClick={() => onOpen("stay")} className={PART}>
        <StateDot state={stay.dot} />
        <span className="text-sm text-white tabular-nums">{stayText}</span>
        {stay.on && stay.escapes > 0 && (
          <span className="text-xs text-escape tabular-nums">{stay.escapes}</span>
        )}
      </button>
      {pomodoro.on && (
        <button
          type="button"
          onClick={() => onOpen("pomodoro")}
          className={`${PART} border-l border-border-default`}
        >
          <StateDot state={pomodoro.dot} />
          <span className="text-sm text-white tabular-nums">{pomodoro.clock}</span>
        </button>
      )}
      {timer.on && (
        <button
          type="button"
          onClick={() => onOpen("timer")}
          className={`${PART} border-l border-border-default`}
        >
          <StateDot state={timer.dot} />
          <span className="text-sm text-white tabular-nums">
            {timer.status === "done" ? t("timer.chipDone") : timer.clock}
          </span>
        </button>
      )}
    </div>
  );
}

/** Mobile strip under the header while either timer runs or is paused. */
export function StayStrip({ onOpen }: TimerEntryProps) {
  const { t } = useTranslation();
  const { stay, pomodoro, timer, any } = useTimerSummary();
  if (!any) return null;

  const item = "flex items-center gap-[7px] py-2 text-[13px] text-white";
  const phaseLabel = pomodoro.paused
    ? t("pomodoro.paused")
    : pomodoro.phase === "rest"
      ? t("pomodoro.phaseRest")
      : t("pomodoro.phaseFocus");

  return (
    <div className="flex items-center justify-center gap-3.5 px-4 font-medium border-t border-border-default bg-bg-surface">
      {stay.on && (
        <button type="button" onClick={() => onOpen("stay")} className={item}>
          <StateDot state={stay.dot} />
          <span className="tabular-nums">{stay.clock}</span>
          <small className="text-xs text-text-muted">{t("stay.name")}</small>
        </button>
      )}
      {pomodoro.on && (
        <button type="button" onClick={() => onOpen("pomodoro")} className={item}>
          <StateDot state={pomodoro.dot} />
          <span className="tabular-nums">{pomodoro.clock}</span>
          <small className="text-xs text-text-muted">{phaseLabel}</small>
        </button>
      )}
      {timer.on && (
        <button type="button" onClick={() => onOpen("timer")} className={item}>
          <StateDot state={timer.dot} />
          <span className="tabular-nums">
            {timer.status === "done" ? t("timer.chipDone") : timer.clock}
          </span>
          <small className="text-xs text-text-muted">{timer.label || t("timer.stripName")}</small>
        </button>
      )}
      {stay.on && stay.escapes > 0 && (
        <button
          type="button"
          onClick={() => onOpen("stay")}
          aria-label={t("stay.openTimers")}
          className="py-2 text-xs text-escape tabular-nums"
        >
          {t("stay.stripEscapes", { n: stay.escapes })}
        </button>
      )}
    </div>
  );
}
