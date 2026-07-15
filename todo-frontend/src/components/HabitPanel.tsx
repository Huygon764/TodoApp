import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Check, Settings2, BarChart3, ChevronDown } from "lucide-react";
import type { HabitToday, HabitTodayEntry, HabitDayState } from "@/types";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePersistentBoolean } from "@/hooks/usePersistentBoolean";

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface HabitPanelProps {
  /** Selected day, YYYY-MM-DD. Ticking is only allowed when this is today. */
  date: string;
  onManage: () => void;
  onStats: () => void;
}

function scheduleLabel(daysOfWeek: number[]): string {
  if (daysOfWeek.length === 7) return "Every day";
  return [...daysOfWeek]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_SHORT[d - 1])
    .join(" · ");
}

function Ring({ pct }: { pct: number }) {
  const R = 17;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative shrink-0 w-[42px] h-[42px]">
      <svg width="42" height="42" className="-rotate-90">
        <circle cx="21" cy="21" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <motion.circle
          cx="21"
          cy="21"
          r={R}
          fill="none"
          stroke="var(--color-accent-primary)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={C}
          animate={{ strokeDashoffset: C * (1 - pct / 100) }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9.5px] font-bold text-accent-hover tabular-nums tracking-tight">
        {pct}%
      </span>
    </div>
  );
}

const dotClass = (state: HabitDayState, isToday: boolean) => {
  const base = "w-[7px] h-[7px] rounded-full border";
  const ring = isToday ? " ring-2 ring-accent-primary/25" : "";
  if (state === "done") return `${base} bg-accent-primary border-accent-primary${ring}`;
  if (state === "missed") return `${base} bg-transparent border-danger/45${ring}`;
  // "off" (not scheduled / before the habit existed) — a muted but visible dot
  // so the 7-day row always reads as a row, not a lone dot floating at the end.
  return `${base} bg-bg-elevated border-border-strong${ring}`;
};

export function HabitPanel({ date, onManage, onStats }: HabitPanelProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = usePersistentBoolean("habitPanel.expanded", true);

  const { data, isLoading } = useQuery({
    queryKey: ["habits", "today"],
    queryFn: async () => {
      const res = await apiGet<HabitToday>(API_PATHS.HABITS_TODAY);
      return res.data ?? { today: date, habits: [] };
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (habitId: string) =>
      apiPost(API_PATHS.HABIT_TOGGLE(habitId), {}),
    onMutate: async (habitId: string) => {
      await queryClient.cancelQueries({ queryKey: ["habits", "today"] });
      const previous = queryClient.getQueryData<HabitToday>(["habits", "today"]);
      queryClient.setQueryData<HabitToday>(["habits", "today"], (old) => {
        if (!old) return old;
        return {
          ...old,
          habits: old.habits.map((h) =>
            h.id === habitId
              ? {
                  ...h,
                  doneToday: !h.doneToday,
                  streak: h.doneToday ? Math.max(0, h.streak - 1) : h.streak + 1,
                  last7: h.last7.map((c, i) =>
                    i === h.last7.length - 1
                      ? { ...c, state: h.doneToday ? "missed" : "done" }
                      : c,
                  ),
                }
              : h,
          ),
        };
      });
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["habits", "today"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["habits", "today"] });
    },
  });

  const today = data?.today;
  const habits = data?.habits ?? [];
  const isToday = today != null && date === today;
  const doneCount = habits.filter((h) => h.doneToday).length;
  const total = habits.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const maxDots = isMobile ? 5 : 7;

  return (
    <div className="rounded-3xl bg-bg-card border border-border-default overflow-hidden">
      <div className="flex items-center gap-2 p-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
          aria-label={expanded ? t("common.collapse", "Collapse") : t("common.expand", "Expand")}
        >
          <Ring pct={pct} />
          <span className="min-w-0">
            <span className="block text-base font-semibold text-white">
              {t("habits.title", "Discipline")}
            </span>
            <span className="block text-sm text-text-muted">
              {t("habits.doneToday", "{{done}}/{{total}} today", { done: doneCount, total })}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onManage}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-border-default bg-bg-surface text-text-muted hover:text-accent-hover hover:border-accent-primary/40 transition-colors cursor-pointer"
          aria-label={t("habits.manage", "Manage habits")}
        >
          <Settings2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onStats}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-border-default bg-bg-surface text-text-muted hover:text-accent-hover hover:border-accent-primary/40 transition-colors cursor-pointer"
          aria-label={t("habits.stats", "Stats")}
        >
          <BarChart3 className="w-4 h-4" />
        </button>
        <motion.button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          animate={{ rotate: expanded ? 0 : -90 }}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-accent-hover transition-colors cursor-pointer"
          aria-hidden="true"
          tabIndex={-1}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: isMobile ? 0.16 : 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-bg-surface animate-pulse" />
              ))}
            </div>
          ) : total === 0 ? (
            <button
              type="button"
              onClick={onManage}
              className="w-full py-6 text-center text-sm text-text-muted hover:text-accent-hover transition-colors cursor-pointer"
            >
              {t("habits.empty", "No habits yet. Add the things you must do daily.")}
            </button>
          ) : !isToday ? (
            <p className="px-3 py-4 text-sm text-text-muted">
              {t("habits.pastDay", "Habits are ticked on the day itself.")}
            </p>
          ) : (
            <div className="space-y-1.5">
              {habits.map((h) => (
                <HabitRow
                  key={h.id}
                  habit={h}
                  maxDots={maxDots}
                  showSchedule={!isMobile}
                  onToggle={() => toggleMutation.mutate(h.id)}
                />
              ))}
            </div>
          )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface HabitRowProps {
  habit: HabitTodayEntry;
  maxDots: number;
  showSchedule: boolean;
  onToggle: () => void;
}

function HabitRow({ habit, maxDots, showSchedule, onToggle }: HabitRowProps) {
  const dots = habit.last7.slice(habit.last7.length - maxDots);
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
        habit.doneToday
          ? "bg-accent-primary/[0.06] border-accent-primary/20"
          : "bg-bg-surface border-border-subtle"
      }`}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={onToggle}
        className={`shrink-0 w-[26px] h-[26px] rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
          habit.doneToday
            ? "bg-accent-primary border-accent-primary"
            : "border-text-muted hover:border-accent-hover hover:bg-accent-primary/10"
        }`}
        aria-label={habit.name}
      >
        {habit.doneToday && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </motion.button>
      <div className="flex-1 min-w-0">
        <span
          className={`block text-[14.5px] [overflow-wrap:anywhere] ${
            habit.doneToday ? "text-text-tertiary" : "text-text-secondary"
          }`}
        >
          {habit.name}
        </span>
        {showSchedule && (
          <span className="block text-[11px] text-text-faint">{scheduleLabel(habit.daysOfWeek)}</span>
        )}
      </div>
      <span
        className={`shrink-0 inline-flex items-center gap-1 text-[12.5px] font-bold tabular-nums ${
          habit.streak === 0 ? "text-text-faint" : "text-amber-400"
        }`}
      >
        <Flame className="w-3.5 h-3.5" />
        {habit.streak}
      </span>
      <span className="shrink-0 flex gap-[3px]">
        {dots.map((c, i) => (
          <span key={c.date} className={dotClass(c.state, i === dots.length - 1)} />
        ))}
      </span>
    </div>
  );
}
