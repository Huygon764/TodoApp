import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Flame } from "lucide-react";
import type { HabitStats, HabitDayState } from "@/types";
import { API_PATHS } from "@/constants/api";
import { apiGet } from "@/lib/api";
import { ModalContainer } from "@/components/shared/ModalContainer";
import { ModalHeader } from "@/components/shared/ModalHeader";
import { useModalClose } from "@/hooks/useModalClose";

interface HabitStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAYS = 91; // 13 weeks

const cellClass = (state: HabitDayState) => {
  const base = "w-[11px] h-[11px] rounded-[3px] shrink-0";
  if (state === "done") return `${base} bg-accent-primary`;
  if (state === "missed") return `${base} bg-danger/[0.16]`;
  return `${base} bg-white/[0.03]`;
};

/** Group the day cells into week columns (7 rows) for a GitHub-style heatmap. */
function Heatmap({ days }: { days: { date: string; state: HabitDayState }[] }) {
  const cols: { date: string; state: HabitDayState }[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    cols.push(days.slice(i, i + 7));
  }
  return (
    <div className="flex gap-[2.5px] overflow-x-auto pb-1">
      {cols.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-[2.5px]">
          {col.map((c) => (
            <span key={c.date} className={cellClass(c.state)} title={c.date} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Kpi({ label, value, unit, flame }: { label: string; value: number | string; unit?: string; flame?: boolean }) {
  return (
    <div className="bg-bg-card px-4 py-4">
      <div className="text-[10.5px] uppercase tracking-wide text-text-muted font-semibold">{label}</div>
      <div className={`mt-1 text-[23px] font-bold tabular-nums flex items-baseline gap-1 ${flame ? "text-amber-400" : "text-white"}`}>
        {value}
        {unit && <span className="text-xs font-medium text-text-muted">{unit}</span>}
      </div>
    </div>
  );
}

export function HabitStatsModal({ isOpen, onClose }: HabitStatsModalProps) {
  const { t } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  useModalClose(isOpen, onClose, contentRef);

  const { data, isLoading } = useQuery({
    queryKey: ["habits", "stats", DAYS],
    queryFn: async () => {
      const res = await apiGet<HabitStats>(API_PATHS.HABIT_STATS(DAYS));
      return res.data ?? null;
    },
    enabled: isOpen,
  });

  const pct = (r: number) => Math.round(r * 100);

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} contentRef={contentRef} maxWidth="max-w-2xl">
      <ModalHeader
        icon={<BarChart3 className="w-5 h-5 text-accent-hover" />}
        title={t("habitStats.title", "Discipline · 90 days")}
        onClose={onClose}
      />

      {isLoading || !data ? (
        <div className="p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-bg-surface animate-pulse" />
          ))}
        </div>
      ) : data.habits.length === 0 ? (
        <div className="p-10 text-center text-text-muted">
          {t("habitStats.empty", "No habits to analyse yet.")}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-px bg-border-subtle border-b border-border-subtle">
            <Kpi label={t("habitStats.bestStreak", "Best streak")} value={data.overall.bestStreak} unit={t("habitStats.days", "days")} flame />
            <Kpi label={t("habitStats.rate30", "30-day rate")} value={pct(data.overall.rate30)} unit="%" />
            <Kpi label={t("habitStats.perfectDays", "Perfect days")} value={data.overall.perfectDays30} unit="/30" />
          </div>

          <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border-subtle text-[11.5px] text-text-muted">
            <span className="text-text-faint">{t("habitStats.legendHint", "Each square is a day · last 13 weeks")}</span>
            <span className="ml-auto flex items-center gap-1.5"><span className={cellClass("done")} /> {t("habitStats.legendDone", "done")}</span>
            <span className="flex items-center gap-1.5"><span className={cellClass("missed")} /> {t("habitStats.legendMissed", "missed")}</span>
            <span className="flex items-center gap-1.5"><span className={cellClass("off")} /> {t("habitStats.legendOff", "off")}</span>
          </div>

          <div className="max-h-[46vh] overflow-y-auto">
            {data.habits.map((h) => {
              const rate = pct(h.rate30);
              const rateColor = rate >= 80 ? "text-success" : rate < 50 ? "text-danger" : "text-text-tertiary";
              return (
                <div key={h.id} className="px-5 py-4 border-b border-border-subtle last:border-b-0 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex-1 min-w-0 text-sm font-medium text-text-secondary [overflow-wrap:anywhere]">
                      {h.name}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold tabular-nums ${h.streak === 0 ? "text-text-faint" : "text-amber-400"}`}>
                      <Flame className="w-3 h-3" />
                      {h.streak}
                    </span>
                    <span className="text-[11.5px] text-text-faint">{t("habitStats.best", "best {{n}}", { n: h.bestStreak })}</span>
                    <span className={`text-xs font-semibold tabular-nums ${rateColor}`}>{rate}%</span>
                  </div>
                  <Heatmap days={h.days} />
                </div>
              );
            })}
          </div>

          {data.worst && (
            <p className="px-5 py-3 bg-danger/[0.06] border-t border-danger/[0.16] text-[13px] text-text-tertiary leading-snug">
              {t("habitStats.worst", "Weakest over 30 days: {{name}} — {{rate}}%, broke {{breaks}} times.", {
                name: data.worst.name,
                rate: pct(data.worst.rate30),
                breaks: data.worst.breaks30,
              })}
            </p>
          )}
        </>
      )}
    </ModalContainer>
  );
}
