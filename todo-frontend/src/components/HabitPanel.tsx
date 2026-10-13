import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Check, Settings2, BarChart3, ChevronDown, Moon } from "lucide-react";
import type { HabitToday, HabitTodayEntry, HabitDayState } from "@/types";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePersistentBoolean } from "@/hooks/usePersistentBoolean";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { sortItemsByCompletion } from "@/lib/sortItems";

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

interface HabitPanelProps {
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

function Ring({ pct, isMobile }: { pct: number; isMobile: boolean }) {
  const R = 17;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - pct / 100);
  return (
    <div className="relative shrink-0 w-[42px] h-[42px]">
      <svg width="42" height="42" className="-rotate-90">
        <circle cx="21" cy="21" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        {isMobile ? (
          <circle
            cx="21"
            cy="21"
            r={R}
            fill="none"
            stroke="var(--color-accent-primary)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
          />
        ) : (
          <motion.circle
            cx="21"
            cy="21"
            r={R}
            fill="none"
            stroke="var(--color-accent-primary)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={C}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        )}
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
  if (state === "skipped") return `${base} bg-sky-400/80 border-sky-400${ring}`;
  if (state === "slack") return `${base} bg-slack border-slack${ring}`;
  return `${base} bg-bg-elevated border-border-strong${ring}`;
};

export function HabitPanel({ date, onManage, onStats }: HabitPanelProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = usePersistentBoolean("habitPanel.expanded", true);
  const queryKey = ["habits", "panel", date] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiGet<HabitToday>(API_PATHS.HABITS_TODAY(date));
      return res.data ?? { today: date, date, habits: [] };
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["habits"] });
  };

  const toggleMutation = useMutation({
    mutationFn: (habitId: string) => apiPost(API_PATHS.HABIT_TOGGLE(habitId), { date }),
    onMutate: async (habitId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<HabitToday>(queryKey);
      if (!previous) return { previous };
      queryClient.setQueryData<HabitToday>(queryKey, {
        ...previous,
        habits: previous.habits.map((h) => {
          if (h.id !== habitId) return h;
          const doneToday = !h.doneToday;
          return {
            ...h,
            doneToday,
            skippedToday: false,
            slackToday: false,
            last7: h.last7.map((cell) =>
              cell.date === date
                ? { ...cell, state: doneToday ? "done" : "missed" }
                : cell,
            ),
          };
        }),
      });
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
    },
    onSettled: invalidate,
  });

  const skipMutation = useMutation({
    mutationFn: (habitId: string) => apiPost(API_PATHS.HABIT_SKIP(habitId), { date }),
    onSettled: invalidate,
  });

  const slackMutation = useMutation({
    mutationFn: (habitId: string) => apiPost(API_PATHS.HABIT_SLACK(habitId), { date }),
    onSettled: invalidate,
  });

  const skipDayMutation = useMutation({
    mutationFn: () => apiPost(API_PATHS.HABITS_SKIP_DAY, { date }),
    onSettled: invalidate,
  });

  const unskipDayMutation = useMutation({
    mutationFn: () => apiPost(API_PATHS.HABITS_UNSKIP_DAY, { date }),
    onSettled: invalidate,
  });

  const today = data?.today;
  const habits = data?.habits ?? [];
  const yesterday = today ? addDays(today, -1) : null;
  const canMutate = today != null && (date === today || date === yesterday);
  const doneCount = habits.filter((h) => h.doneToday).length;
  const countable = habits.filter((h) => !h.skippedToday && !h.slackToday).length;
  const total = habits.length;
  const pct = countable > 0 ? Math.round((doneCount / countable) * 100) : total > 0 ? 100 : 0;
  const anySkipped = habits.some((h) => h.skippedToday);
  const needsSkip = habits.some((h) => !h.doneToday && !h.skippedToday && !h.slackToday);
  const maxDots = isMobile ? 5 : 7;
  const showBody = expanded;

  const list = isLoading ? (
    <ListSkeleton rowClassName="h-12" />
  ) : total === 0 ? (
    <button
      type="button"
      onClick={onManage}
      className="w-full py-6 text-center text-sm text-text-muted hover:text-accent-hover transition-colors cursor-pointer"
    >
      {t("habits.empty", "No habits yet. Add the things you must do daily.")}
    </button>
  ) : (
    <div className="space-y-1.5">
      <AnimatePresence initial={false} mode="popLayout">
        {sortItemsByCompletion(
          habits.map((h) => ({ ...h, completed: h.doneToday })),
        ).map((h) => (
          <motion.div key={h.id} layout layoutId={h.id}>
            <HabitRow
              habit={h}
              maxDots={maxDots}
              showSchedule={!isMobile}
              canMutate={canMutate}
              onToggle={() => toggleMutation.mutate(h.id)}
              onSkip={() => skipMutation.mutate(h.id)}
              onSlack={() => slackMutation.mutate(h.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <div
      className={`rounded-xl bg-bg-card border border-border-default overflow-hidden flex flex-col ${
        expanded ? "h-full min-h-0 md:max-h-[30vh]" : "self-start"
      }`}
    >
      <div className="shrink-0 flex items-center gap-2 p-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
          aria-expanded={expanded}
          aria-label={expanded ? t("common.collapse", "Collapse") : t("common.expand", "Expand")}
        >
          <Ring pct={pct} isMobile={isMobile} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold text-white">
              {t("habits.title", "Discipline")}
            </span>
            <span className="block truncate text-sm text-text-muted">
              {t("habits.doneToday", "{{done}}/{{total}} today", { done: doneCount, total: countable })}
            </span>
          </span>
        </button>
        <div className="shrink-0 flex items-center gap-1">
          {canMutate && total > 0 && (needsSkip || anySkipped) && (
            <>
              {needsSkip && (
                <button
                  type="button"
                  onClick={() => skipDayMutation.mutate()}
                  className="px-2 h-8 text-[11px] font-medium rounded-lg border border-border-default bg-bg-surface text-text-muted hover:text-sky-300 hover:border-sky-400/40 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {t("habits.skipDay", "Skip day")}
                </button>
              )}
              {anySkipped && (
                <button
                  type="button"
                  onClick={() => unskipDayMutation.mutate()}
                  className="px-2 h-8 text-[11px] font-medium rounded-lg border border-border-default bg-bg-surface text-text-muted hover:text-sky-300 hover:border-sky-400/40 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {t("habits.unskipDay", "Unskip day")}
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={onManage}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border-default bg-bg-surface text-text-muted hover:text-accent-hover hover:border-accent-primary/40 transition-colors cursor-pointer"
            aria-label={t("habits.manage", "Manage habits")}
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onStats}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border-default bg-bg-surface text-text-muted hover:text-accent-hover hover:border-accent-primary/40 transition-colors cursor-pointer"
            aria-label={t("habits.stats", "Stats")}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
        <motion.button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          animate={{ rotate: expanded ? 180 : 0 }}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-accent-hover transition-colors cursor-pointer"
          aria-hidden="true"
          tabIndex={-1}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.button>
      </div>

      {isMobile ? (
        showBody ? (
          <div className="px-3 pb-3">{list}</div>
        ) : null
      ) : (
        <motion.div
          initial={false}
          animate={
            expanded
              ? { height: "auto", opacity: 1 }
              : { height: 0, opacity: 0 }
          }
          transition={{ duration: 0.22, ease: "easeInOut" }}
          className={`min-h-0 overflow-hidden ${expanded ? "" : "pointer-events-none"}`}
          aria-hidden={!expanded}
        >
          <div className="overflow-y-auto px-3 pb-3 md:max-h-[calc(30vh-3.5rem)]">{list}</div>
        </motion.div>
      )}
    </div>
  );
}

interface HabitRowProps {
  habit: HabitTodayEntry;
  maxDots: number;
  showSchedule: boolean;
  canMutate: boolean;
  onToggle: () => void;
  onSkip: () => void;
  onSlack: () => void;
}

function HabitRow({ habit, maxDots, showSchedule, canMutate, onToggle, onSkip, onSlack }: HabitRowProps) {
  const { t } = useTranslation();
  const dots = habit.last7.slice(habit.last7.length - maxDots);
  const moonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const openMenu = () => {
    const rect = moonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({ top: rect.top, right: window.innerWidth - rect.right });
  };
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
        habit.doneToday
          ? "bg-accent-primary/[0.06] border-accent-primary/20"
          : habit.slackToday
            ? "bg-slack/10 border-slack/30"
          : habit.skippedToday
            ? "bg-sky-400/[0.06] border-sky-400/20"
            : "bg-bg-surface border-border-subtle"
      }`}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={onToggle}
        disabled={!canMutate}
        className={`shrink-0 w-[26px] h-[26px] rounded-lg border-2 flex items-center justify-center transition-all ${
          canMutate ? "cursor-pointer" : "cursor-default opacity-70"
        } ${
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
          className={`block [overflow-wrap:anywhere] text-[14.5px] ${
            habit.doneToday || habit.skippedToday || habit.slackToday
              ? "text-text-tertiary"
              : "text-text-secondary"
          }`}
        >
          {habit.name}
        </span>
        {showSchedule && (
          <span className="block text-[11px] text-text-faint">{scheduleLabel(habit.daysOfWeek)}</span>
        )}
      </div>
      {canMutate && (
        <button
          ref={moonRef}
          type="button"
          onClick={openMenu}
          className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
            habit.slackToday
              ? "border-slack/50 text-slack bg-slack/10"
              : habit.skippedToday
                ? "border-sky-400/50 text-sky-300 bg-sky-400/10"
                : "border-border-default text-text-muted hover:text-sky-300 hover:border-sky-400/40"
          }`}
          aria-label={
            habit.slackToday
              ? t("habits.unslack", "Clear slack {{name}}", { name: habit.name })
              : habit.skippedToday
                ? t("habits.unskip", "Unskip {{name}}", { name: habit.name })
                : t("habits.skip", "Skip {{name}}", { name: habit.name })
          }
          aria-expanded={menuPos != null}
        >
          <Moon className="w-3.5 h-3.5" />
        </button>
      )}
      {menuPos &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label={t("common.cancel", "Cancel")}
              onClick={() => setMenuPos(null)}
            />
            <div
              className="fixed z-50 flex flex-col gap-1 rounded-lg border border-border-default bg-bg-elevated p-1 shadow-lg"
              style={{ top: menuPos.top - 4, right: menuPos.right, transform: "translateY(-100%)" }}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuPos(null);
                  onSkip();
                }}
                className={`px-3 h-8 text-left text-xs font-medium rounded-md cursor-pointer ${
                  habit.skippedToday ? "text-sky-300 bg-sky-400/10" : "text-text-secondary hover:bg-bg-surface"
                }`}
              >
                {t("habits.markSkip", "Skip")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuPos(null);
                  onSlack();
                }}
                className={`px-3 h-8 text-left text-xs font-medium rounded-md cursor-pointer ${
                  habit.slackToday ? "text-slack bg-slack/10" : "text-text-secondary hover:bg-bg-surface"
                }`}
              >
                {t("habits.markSlack", "Slack")}
              </button>
            </div>
          </>,
          document.body,
        )}
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
