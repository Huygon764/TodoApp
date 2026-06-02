import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Target, ChevronDown, Check } from "lucide-react";
import type { Goal, GoalItem } from "@/types";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPatch } from "@/lib/api";
import { getWeekPeriod, getMonthPeriod } from "@/lib/datePeriod";
import { sortItemsByCompletion } from "@/lib/sortItems";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePersistentBoolean } from "@/hooks/usePersistentBoolean";

type GoalType = "week" | "month";

interface DayGoalsPanelProps {
  /** Selected day, YYYY-MM-DD. The card shows that day's week and month goals. */
  date: string;
}

export function DayGoalsPanel({ date }: DayGoalsPanelProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = usePersistentBoolean("focusPanel.expanded", true);

  // Parse as local midnight so the week/month period matches the calendar day.
  const d = new Date(date + "T00:00:00");
  const weekPeriod = getWeekPeriod(d);
  const monthPeriod = getMonthPeriod(d);

  const weekGoal = useQuery({
    queryKey: ["goal", "week", weekPeriod],
    queryFn: async () => {
      const res = await apiGet<{ goal: Goal }>(
        API_PATHS.GOALS_QUERY("week", weekPeriod)
      );
      return res.data?.goal ?? null;
    },
  });
  const monthGoal = useQuery({
    queryKey: ["goal", "month", monthPeriod],
    queryFn: async () => {
      const res = await apiGet<{ goal: Goal }>(
        API_PATHS.GOALS_QUERY("month", monthPeriod)
      );
      return res.data?.goal ?? null;
    },
  });

  // Shared "goal" query key with GoalModal, so toggling here and editing in the
  // modal stay in sync.
  const patchMutation = useMutation({
    mutationFn: ({
      goalId,
      items,
    }: {
      goalId: string;
      type: GoalType;
      period: string;
      items: GoalItem[];
    }) => apiPatch<{ goal: Goal }>(API_PATHS.GOAL(goalId), { items }),
    onMutate: async ({ type, period, items }) => {
      const queryKey = ["goal", type, period];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Goal | null>(queryKey);
      if (previous) queryClient.setQueryData(queryKey, { ...previous, items });
      return { queryKey, previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["goal", vars.type, vars.period],
      });
    },
  });

  // Toggle by item reference (not display index) since the rendered list is
  // sorted, so a display index would not match the stored items array.
  const toggle = (type: GoalType, period: string, goal: Goal, item: GoalItem) => {
    const items = goal.items.map((it) =>
      it === item ? { ...it, completed: !it.completed } : it
    );
    patchMutation.mutate({ goalId: goal._id, type, period, items });
  };

  const groups = [
    {
      type: "week" as const,
      period: weekPeriod,
      label: t("dayGoals.weekLabel"),
      goal: weekGoal.data ?? null,
    },
    {
      type: "month" as const,
      period: monthPeriod,
      label: t("dayGoals.monthLabel"),
      goal: monthGoal.data ?? null,
    },
  ].filter((g) => g.goal && g.goal.items.length > 0);

  // Nothing to show until the user has set goals for this week or month.
  if (groups.length === 0) return null;

  return (
    <div className="relative rounded-3xl bg-bg-card border border-border-default overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-bg-card/80 transition-colors duration-200"
      >
        <span className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-accent-primary/10">
            <Target className="w-4 h-4 text-accent-hover" />
          </span>
          <span className="text-base font-semibold text-white">
            {t("dayGoals.title")}
          </span>
        </span>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
          <ChevronDown className="w-4 h-4 text-text-tertiary" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: isMobile ? 0.16 : 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {groups.map((g) => (
                <div key={g.type}>
                  <p className="text-xs uppercase tracking-wide text-text-muted mb-2">
                    {g.label}
                  </p>
                  <ul className="space-y-1.5">
                    {sortItemsByCompletion(g.goal!.items).map((item, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggle(g.type, g.period, g.goal!, item)}
                          className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors duration-200 cursor-pointer ${
                            item.completed
                              ? "bg-accent-primary border-accent-primary text-white"
                              : "border-text-muted hover:border-accent-hover"
                          }`}
                        >
                          {item.completed && <Check className="w-3 h-3" />}
                        </motion.button>
                        <span
                          className={`text-sm ${
                            item.completed
                              ? "line-through text-text-muted"
                              : "text-text-secondary"
                          }`}
                        >
                          {item.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
