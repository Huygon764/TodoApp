import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, ListTodo, ChevronDown, ChevronRight } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiDelete, apiPatch } from "@/lib/api";
import type { RecurringTemplate } from "@/types";
import { useModalClose } from "@/hooks/useModalClose";
import { ModalContainer } from "@/components/shared/ModalContainer";
import { ModalHeader } from "@/components/shared/ModalHeader";
import { ItemAddInput } from "@/components/shared/ItemAddInput";
import { SubTaskSection } from "@/components/shared/SubTaskSection";

/** Recurring template: week/month/year; items are added to day todo based on schedule */
type RecurringTab = "week" | "month" | "year";

interface RecurringTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: RecurringTab;
}

export function RecurringTemplateModal({
  isOpen,
  onClose,
  initialTab = "week",
}: RecurringTemplateModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<RecurringTab>(initialTab);
  const [newTitle, setNewTitle] = useState("");
  const { editingId: editingIndex, editValue, setEditValue, editInputRef, startEdit, cancelEdit, finishEdit } = useInlineEdit<number>();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState<Record<number, string>>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Context-level schedule selectors (single-day context per tab)
  const [weeklyContextDay, setWeeklyContextDay] = useState<number>(1); // 1 = Monday
  const [monthlyContextDay, setMonthlyContextDay] = useState<number>(1); // 1-31
  const [yearlyContext, setYearlyContext] = useState<{ month: number; day: number }>(() => {
    const today = new Date();
    return { month: today.getMonth() + 1, day: today.getDate() };
  });

  const queryKey = ["recurringTemplate", activeTab];

  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiGet<{ template: RecurringTemplate }>(
        API_PATHS.RECURRING_TEMPLATES_QUERY(activeTab as "week" | "month" | "year")
      );
      return res.data?.template ?? null;
    },
    enabled: isOpen,
  });

  const template = data ?? null;
  const items = template?.items ?? [];

  // Derive visible items for current context, but keep original index for API ops
  const visibleItems = items
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => {
      if (activeTab === "week") {
        return Array.isArray(item.daysOfWeek) && item.daysOfWeek.includes(weeklyContextDay);
      }
      if (activeTab === "month") {
        return Array.isArray(item.daysOfMonth) && item.daysOfMonth.includes(monthlyContextDay);
      }
      if (activeTab === "year") {
        return (
          Array.isArray(item.datesOfYear) &&
          item.datesOfYear.some(
            (d) => d.month === yearlyContext.month && d.day === yearlyContext.day
          )
        );
      }
      return false;
    });

  const addMutation = useMutation({
    mutationFn: (title: string) =>
      apiPost<{ template: RecurringTemplate }>(API_PATHS.RECURRING_TEMPLATES, {
        type: activeTab as "week" | "month" | "year",
        title,
        order: items.length,
        ...(activeTab === "week" ? { daysOfWeek: [weeklyContextDay] } : {}),
        ...(activeTab === "month" ? { daysOfMonth: [monthlyContextDay] } : {}),
        ...(activeTab === "year"
          ? { datesOfYear: [{ month: yearlyContext.month, day: yearlyContext.day }] }
          : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (idx: number) =>
      apiDelete(API_PATHS.RECURRING_TEMPLATE_ITEM(activeTab, idx)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  type PatchPayload = {
    idx: number;
    title?: string;
    daysOfWeek?: number[];
    daysOfMonth?: number[];
    datesOfYear?: { month: number; day: number }[];
    subTasks?: { title: string }[];
  };

  const patchItemMutation = useMutation({
    mutationFn: ({ idx, title, daysOfWeek, daysOfMonth, datesOfYear, subTasks }: PatchPayload) =>
      apiPatch(API_PATHS.RECURRING_TEMPLATE_ITEM(activeTab, idx), {
        ...(title !== undefined ? { title } : {}),
        ...(daysOfWeek !== undefined ? { daysOfWeek } : {}),
        ...(daysOfMonth !== undefined ? { daysOfMonth } : {}),
        ...(datesOfYear !== undefined ? { datesOfYear } : {}),
        ...(subTasks !== undefined ? { subTasks } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleTitleClick = (index: number) => {
    const item = items[index];
    if (item) startEdit(index, item.title);
  };

  const saveRecurringTitle = (index: number) => {
    const value = finishEdit();
    if (!value) return;
    patchItemMutation.mutate({ idx: index, title: value });
  };

  const addSubTask = (idx: number, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const item = items[idx];
    if (!item) return;
    const subTasks = [...(item.subTasks ?? []), { title: trimmed }];
    patchItemMutation.mutate({ idx, subTasks });
    setNewSubTaskTitle((prev) => ({ ...prev, [idx]: "" }));
  };

  const deleteSubTask = (idx: number, subIndex: number) => {
    const item = items[idx];
    if (!item) return;
    const subTasks = (item.subTasks ?? []).filter((_, i) => i !== subIndex);
    patchItemMutation.mutate({ idx, subTasks });
  };

  useModalClose(isOpen, onClose, contentRef);

  useEffect(() => {
    if (isOpen && initialTab) setActiveTab(initialTab as RecurringTab);
  }, [isOpen, initialTab]);

  const addItem = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
    setNewTitle("");
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} contentRef={contentRef}>
                <ModalHeader
                  icon={<ListTodo className="w-5 h-5 text-[#7C85E0]" />}
                  title={t("recurringModal.title")}
                  subtitle={t("recurringModal.subtitle")}
                  onClose={onClose}
                />

                <div className="flex border-b border-white/[0.04]">
                  {(["week", "month", "year"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        activeTab === tab
                          ? "text-[#7C85E0] border-b-2 border-linear-accent bg-[#5E6AD2]/5"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {tab === "week"
                        ? t("recurringModal.tabWeek")
                        : tab === "month"
                        ? t("recurringModal.tabMonth")
                        : t("recurringModal.tabYear")}
                    </button>
                  ))}
                </div>

                {/* Context selector per tab (single-day context, like DateTemplateModal) */}
                <div className="p-4 border-b border-white/[0.04]">
                  {activeTab === "week" && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-400">
                        {t("recurringModal.tabWeek")}:
                      </span>
                      <div className="flex gap-1 flex-wrap">
                        {[
                          { label: "Mon", value: 1 },
                          { label: "Tue", value: 2 },
                          { label: "Wed", value: 3 },
                          { label: "Thu", value: 4 },
                          { label: "Fri", value: 5 },
                          { label: "Sat", value: 6 },
                          { label: "Sun", value: 7 },
                        ].map((day) => {
                          const active = weeklyContextDay === day.value;
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => setWeeklyContextDay(day.value)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                                active
                                  ? "bg-[#5E6AD2]/20 border-[#5E6AD2]/60 text-[#7C85E0]"
                                  : "bg-slate-800/60 border-white/5 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200"
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeTab === "month" && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-400">
                        {t("recurringModal.tabMonth")}:
                      </span>
                      <select
                        value={monthlyContextDay}
                        onChange={(e) => setMonthlyContextDay(Number(e.target.value) || 1)}
                        className="rounded-lg bg-linear-surface border border-white/10 text-xs text-slate-200 px-3 py-1 focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]/60 focus:border-[#5E6AD2]/60"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeTab === "year" && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-400">
                        {t("recurringModal.tabYear")}:
                      </span>
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <span>
                          {String(yearlyContext.day).padStart(2, "0")}/
                          {String(yearlyContext.month).padStart(2, "0")}
                        </span>
                        {/* Simple month/day selectors to avoid heavy calendar UI */}
                        <select
                          value={yearlyContext.month}
                          onChange={(e) =>
                            setYearlyContext((prev) => ({
                              ...prev,
                              month: Number(e.target.value) || 1,
                            }))
                          }
                          className="rounded-lg bg-linear-surface border border-white/10 text-xs text-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]/60 focus:border-[#5E6AD2]/60"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <select
                          value={yearlyContext.day}
                          onChange={(e) =>
                            setYearlyContext((prev) => ({
                              ...prev,
                              day: Number(e.target.value) || 1,
                            }))
                          }
                          className="rounded-lg bg-linear-surface border border-white/10 text-xs text-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]/60 focus:border-[#5E6AD2]/60"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <ItemAddInput
                  value={newTitle}
                  onChange={setNewTitle}
                  onAdd={addItem}
                  placeholder={t("recurringModal.addPlaceholder")}
                  addLabel={t("recurringModal.add")}
                  disabled={!newTitle.trim() || addMutation.isPending}
                />

                <div className="p-4 max-h-[300px] overflow-y-auto">
                  {visibleItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                      <ListTodo className="w-10 h-10 mb-2 opacity-30" />
                      <p>{t("recurringModal.empty")}</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {visibleItems.map(({ item, idx }) => {
                          return (
                            <motion.li
                              key={`${item.title}-${idx}`}
                              layout
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              className="rounded-xl bg-slate-700/30 border border-white/[0.04] hover:bg-slate-700/50 group transition-all duration-200"
                            >
                              <div className="flex items-center gap-3 p-3">
                                {editingIndex === idx ? (
                                  <input
                                    ref={editInputRef}
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveRecurringTitle(idx);
                                      if (e.key === "Escape") cancelEdit();
                                    }}
                                    onBlur={() => saveRecurringTitle(idx)}
                                    className="flex-1 min-w-0 px-0 py-0.5 bg-transparent border-none outline-none text-slate-200 focus:ring-0"
                                  />
                                ) : (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleTitleClick(idx)}
                                    onKeyDown={(e) =>
                                      e.key === "Enter" && handleTitleClick(idx)
                                    }
                                    className="flex-1 text-slate-200 cursor-text"
                                  >
                                    {item.title}
                                  </span>
                                )}
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() =>
                                    setExpandedIdx((prev) => (prev === idx ? null : idx))
                                  }
                                  className="p-2 rounded-lg text-slate-500 hover:text-linear-accent-hover hover:bg-linear-surface transition-all duration-200 cursor-pointer"
                                >
                                  {expandedIdx === idx ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </motion.button>
                                {(item.subTasks ?? []).length > 0 && expandedIdx !== idx && (
                                  <span className="text-xs text-[#7C85E0] font-medium">[{(item.subTasks ?? []).length}]</span>
                                )}
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => deleteMutation.mutate(idx)}
                                  disabled={deleteMutation.isPending}
                                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50"
                                  aria-label={t("recurringModal.deleteAria")}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </motion.button>
                              </div>
                              {expandedIdx === idx && (
                                <SubTaskSection
                                  subTasks={item.subTasks ?? []}
                                  onDelete={(subIdx) => deleteSubTask(idx, subIdx)}
                                  newSubTaskTitle={newSubTaskTitle[idx] ?? ""}
                                  onNewSubTaskTitleChange={(val) =>
                                    setNewSubTaskTitle((prev) => ({ ...prev, [idx]: val }))
                                  }
                                  onAddSubTask={() => addSubTask(idx, newSubTaskTitle[idx] ?? "")}
                                />
                              )}
                            </motion.li>
                          );
                        })}
                      </AnimatePresence>
                    </ul>
                  )}
                </div>

                <div className="p-4 border-t border-white/[0.06] bg-slate-900/30">
                  <p className="text-xs text-slate-500 text-center">
                    {t("recurringModal.footerTip")}
                  </p>
                </div>
    </ModalContainer>
  );
}
