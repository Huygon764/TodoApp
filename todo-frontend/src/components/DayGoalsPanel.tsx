import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { GoalsIcon } from "@/components/icons/GoalsIcon";
import type { Goal, GoalItem } from "@/types";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPatch } from "@/lib/api";
import { getWeekPeriod, getMonthPeriod } from "@/lib/datePeriod";
import { sortItemsByCompletion } from "@/lib/sortItems";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePersistentBoolean } from "@/hooks/usePersistentBoolean";
import { LinkifiedText } from "@/components/shared/LinkifiedText";

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

  // Toggle by stored index. Display order is sorted, so the visible index
  // would not match the items array.
  const toggle = (
    type: GoalType,
    period: string,
    goal: Goal,
    sourceIndex: number,
  ) => {
    const items = goal.items.map((it, i) =>
      i === sourceIndex ? { ...it, completed: !it.completed } : it,
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

  const showBody = !isMobile || expanded;
  const empty = groups.length === 0;

  if (empty && isMobile) return null;

  const list = (
    <div className="px-4 pb-4 space-y-4">
      {empty ? (
        <p className="text-sm text-text-muted py-6 text-center">
          {t("dayGoals.empty")}
        </p>
      ) : (
        groups.map((g) => (
          <div key={g.type}>
            <p className="text-xs uppercase tracking-wide text-text-muted mb-2">
              {g.label}
            </p>
            <ul className="space-y-1.5">
              <AnimatePresence initial={false} mode="popLayout">
                {sortItemsByCompletion(
                  g.goal!.items.map((item, sourceIndex) => ({
                    ...item,
                    sourceIndex,
                  })),
                ).map((item) => (
                  <motion.li
                    key={`${g.type}-${item.sourceIndex}`}
                    layout
                    layoutId={`focus-${g.type}-${item.sourceIndex}`}
                    className="flex items-center gap-3"
                  >
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() =>
                        toggle(g.type, g.period, g.goal!, item.sourceIndex)
                      }
                      className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors duration-200 cursor-pointer ${
                        item.completed
                          ? "bg-accent-primary border-accent-primary text-white"
                          : "border-text-muted hover:border-accent-hover"
                      }`}
                    >
                      {item.completed && <Check className="w-3 h-3" />}
                    </motion.button>
                    <span
                      className={`flex-1 min-w-0 break-words [overflow-wrap:anywhere] text-sm ${
                        item.completed
                          ? "line-through text-text-muted"
                          : "text-text-secondary"
                      }`}
                    >
                      <LinkifiedText text={item.title} />
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="relative rounded-xl bg-bg-card border border-border-default overflow-hidden h-full min-h-0 flex flex-col md:max-h-[30vh]">
      {isMobile ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 w-full flex items-center justify-between p-4 cursor-pointer hover:bg-bg-card/80 transition-colors duration-200"
        >
          <span className="flex items-center gap-3">
            <GoalsIcon className="w-4 h-4 text-accent-hover" />
            <span className="text-base font-semibold text-white">
              {t("dayGoals.title")}
            </span>
          </span>
          <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown className="w-4 h-4 text-text-tertiary" />
          </motion.span>
        </button>
      ) : (
        <div className="shrink-0 flex items-center gap-3 p-4">
          <GoalsIcon className="w-4 h-4 text-accent-hover" />
          <span className="text-base font-semibold text-white">
            {t("dayGoals.title")}
          </span>
        </div>
      )}

      {isMobile ? (
        showBody ? list : null
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">{list}</div>
      )}
    </div>
  );
}
