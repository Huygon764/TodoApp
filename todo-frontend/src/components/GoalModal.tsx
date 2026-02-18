import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Check, Circle, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import {
  getWeekPeriod,
  getMonthPeriod,
  getYearPeriod,
  formatWeekPeriodLabel,
  formatMonthLabel,
  getPrevWeekPeriod,
  getNextWeekPeriod,
  getPrevMonthPeriod,
  getNextMonthPeriod,
  getPrevYearPeriod,
  getNextYearPeriod,
  getWeekOptionsForPicker,
  getMonthOptionsForPicker,
  getYearOptionsForPicker,
} from "@/lib/datePeriod";
import type { Goal, GoalItem } from "@/types";

export type GoalPeriodType = "week" | "month" | "year";

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function addIdsToItems(items: GoalItem[]): (GoalItem & { id: string })[] {
  return items.map((item, index) => ({
    ...item,
    id: `goal-item-${index}-${item.title.slice(0, 8)}`,
  }));
}

function removeIdsFromItems(
  items: (GoalItem & { id: string })[]
): GoalItem[] {
  return items.map(({ id, ...rest }) => rest);
}

export function GoalModal({ isOpen, onClose }: GoalModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<GoalPeriodType>("week");
  const [selectedWeekPeriod, setSelectedWeekPeriod] = useState(getWeekPeriod());
  const [selectedMonthPeriod, setSelectedMonthPeriod] = useState(getMonthPeriod());
  const [selectedYearPeriod, setSelectedYearPeriod] = useState(getYearPeriod());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [pendingToggle, setPendingToggle] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const period =
    activeTab === "week"
      ? selectedWeekPeriod
      : activeTab === "month"
        ? selectedMonthPeriod
        : selectedYearPeriod;
  const queryKey = ["goal", activeTab, period];

  // Reset to current periods when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedWeekPeriod(getWeekPeriod());
      setSelectedMonthPeriod(getMonthPeriod());
      setSelectedYearPeriod(getYearPeriod());
    }
  }, [isOpen]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiGet<{ goal: Goal }>(
        API_PATHS.GOALS_QUERY(activeTab, period)
      );
      return res.data?.goal ?? null;
    },
    enabled: isOpen,
  });

  const goal = data ?? null;
  const itemsWithIds = addIdsToItems(goal?.items ?? []);
  const sortedItems = [...itemsWithIds].sort((a, b) => {
    if (a.completed === b.completed) return a.order - b.order;
    return a.completed ? 1 : -1;
  });

  const patchMutation = useMutation({
    mutationFn: (items: GoalItem[]) =>
      goal
        ? apiPatch<{ goal: Goal }>(API_PATHS.GOAL(goal._id), { items })
        : apiPost<{ goal: Goal }>(API_PATHS.GOALS, {
            type: activeTab,
            period,
            items,
          }),
    onMutate: async (items: GoalItem[]) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, {
        goal: goal ? { ...goal, items } : null,
      });
      return { previous };
    },
    onError: (_err, _items, context) => {
      if (context?.previous != null) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (items: GoalItem[]) =>
      goal
        ? apiPatch<{ goal: Goal }>(API_PATHS.GOAL(goal._id), { items })
        : Promise.reject(new Error("No goal")),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (contentRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!pickerOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (pickerRef.current?.contains(e.target as Node)) return;
      setPickerOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [pickerOpen]);

  const handlePrevPeriod = () => {
    if (activeTab === "week") setSelectedWeekPeriod((p) => getPrevWeekPeriod(p));
    else if (activeTab === "month") setSelectedMonthPeriod((p) => getPrevMonthPeriod(p));
    else setSelectedYearPeriod((p) => getPrevYearPeriod(p));
  };

  const handleNextPeriod = () => {
    if (activeTab === "week") setSelectedWeekPeriod((p) => getNextWeekPeriod(p));
    else if (activeTab === "month") setSelectedMonthPeriod((p) => getNextMonthPeriod(p));
    else setSelectedYearPeriod((p) => getNextYearPeriod(p));
  };

  const pickerOptions =
    activeTab === "week"
      ? getWeekOptionsForPicker(2, 6)
      : activeTab === "month"
        ? getMonthOptionsForPicker(1, 6)
        : getYearOptionsForPicker(1, 3);

  const periodLabel =
    activeTab === "week"
      ? `${period} (${formatWeekPeriodLabel(period)})`
      : activeTab === "month"
        ? formatMonthLabel(period)
        : t("goalModal.yearLabel", { period });

  const handleAdd = () => {
    const t = newTitle.trim();
    if (!t) return;
    const newItems = removeIdsFromItems(sortedItems).concat({
      title: t,
      completed: false,
      order: sortedItems.length,
    });
    patchMutation.mutate(newItems);
    setNewTitle("");
  };

  const handleToggle = (id: string) => {
    if (pendingToggle) return;
    setPendingToggle(id);
    const toggled = sortedItems.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    const incomplete = toggled.filter((it) => !it.completed);
    const completed = toggled.filter((it) => it.completed);
    const reordered = [
      ...incomplete.map((it, idx) => ({ ...it, order: idx })),
      ...completed.map((it, idx) => ({
        ...it,
        order: incomplete.length + idx,
      })),
    ];
    patchMutation.mutate(removeIdsFromItems(reordered));
    // Clear pending after brief scale animation (like DayTodoList)
    setTimeout(() => setPendingToggle(null), 150);
  };

  const handleDelete = (clientId: string) => {
    const filtered = sortedItems.filter((it) => it.id !== clientId);
    const reordered = removeIdsFromItems(
      filtered.map((it, i) => ({ ...it, order: i }))
    );
    if (goal) deleteItemMutation.mutate(reordered);
  };

  const handleSelectPeriod = (p: string) => {
    if (activeTab === "week") setSelectedWeekPeriod(p);
    else if (activeTab === "month") setSelectedMonthPeriod(p);
    else setSelectedYearPeriod(p);
    setPickerOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="relative w-full max-w-lg"
              ref={contentRef}
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-violet-500/20 rounded-3xl blur-xl opacity-50" />
              <div className="relative bg-[#1a1f2e]/95 backdrop-blur-xl rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-violet-500/10">
                      <Target className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        {t("goalModal.title")}
                      </h2>
                      <div ref={pickerRef} className="relative mt-1">
                        <div className="flex items-center gap-1">
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handlePrevPeriod}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-slate-700/50 transition-colors cursor-pointer"
                            aria-label={t("dateNav.prevAria")}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </motion.button>
                          <button
                            type="button"
                            onClick={() => setPickerOpen((o) => !o)}
                            className="min-w-[140px] px-2 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors text-left truncate cursor-pointer"
                          >
                            {periodLabel}
                          </button>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleNextPeriod}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-slate-700/50 transition-colors cursor-pointer"
                            aria-label={t("dateNav.nextAria")}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </motion.button>
                        </div>
                        {pickerOpen && (
                          <div className="absolute left-0 top-full mt-1 w-56 max-h-48 overflow-y-auto rounded-xl bg-slate-800 border border-white/[0.08] shadow-xl z-10 py-1">
                            {pickerOptions.map((opt) => (
                              <button
                                key={opt.period}
                                type="button"
                                onClick={() => handleSelectPeriod(opt.period)}
                                className={`w-full px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                                  opt.period === period
                                    ? "bg-violet-500/20 text-violet-300"
                                    : "text-slate-300 hover:bg-slate-700/50"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/[0.04]">
                  {(["week", "month", "year"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-3 text-sm font-medium transition-colors cursor-pointer ${
                        activeTab === tab
                          ? "text-violet-400 border-b-2 border-violet-400 bg-violet-500/5"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {tab === "week"
                        ? t("goalModal.tabWeek")
                        : tab === "month"
                          ? t("goalModal.tabMonth")
                          : t("goalModal.tabYear")}
                    </button>
                  ))}
                </div>

                {/* Add input */}
                <div className="p-4 border-b border-white/[0.04]">
                  <div className="flex gap-3">
                    <div className="relative flex-1 group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Plus className="w-5 h-5 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                      </div>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        placeholder={t("goalModal.addPlaceholder")}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-700/50 border border-white/[0.04] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 hover:border-slate-600 transition-all duration-200"
                      />
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAdd}
                      disabled={!newTitle.trim() || patchMutation.isPending}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white font-semibold transition-all duration-200 shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {t("goalModal.add")}
                    </motion.button>
                  </div>
                </div>

                {/* List */}
                <div className="p-4 max-h-[300px] overflow-y-auto">
                  {isLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-14 rounded-xl bg-slate-700/30 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : sortedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                      <Circle className="w-10 h-10 mb-2 opacity-30" />
                      <p>{t("goalModal.empty")}</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {sortedItems.map((item) => (
                          <motion.li
                            key={item.id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{
                              opacity: 1,
                              x: 0,
                              scale: pendingToggle === item.id ? 0.98 : 1,
                              transition: { duration: 0.15 },
                            }}
                            exit={{ opacity: 0, x: 10 }}
                            className={`flex items-center gap-4 p-3 rounded-xl border transition-colors duration-200 ${
                              item.completed
                                ? "bg-violet-500/5 border-violet-500/20"
                                : "bg-slate-700/30 border-white/[0.04] hover:bg-slate-700/50"
                            }`}
                          >
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleToggle(item.id)}
                              disabled={pendingToggle !== null}
                              className={`shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                item.completed
                                  ? "bg-violet-500 border-violet-500"
                                  : "border-slate-500 hover:border-violet-400 hover:bg-violet-500/10"
                              } disabled:cursor-not-allowed`}
                            >
                              <AnimatePresence mode="wait">
                                {item.completed && (
                                  <motion.div
                                    initial={{ scale: 0, rotate: -45 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0, rotate: 45 }}
                                    transition={{
                                      type: "spring",
                                      stiffness: 500,
                                      damping: 15,
                                    }}
                                  >
                                    <Check
                                      className="w-4 h-4 text-white"
                                      strokeWidth={3}
                                    />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.button>
                            <span
                              className={`flex-1 ${
                                item.completed
                                  ? "line-through text-slate-500"
                                  : "text-slate-200"
                              }`}
                            >
                              {item.title}
                            </span>
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(item.id)}
                              disabled={deleteItemMutation.isPending}
                              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                              aria-label={t("goalModal.deleteAria")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
