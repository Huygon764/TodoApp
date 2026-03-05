import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker } from "react-day-picker";
import { X, Plus, Trash2, Calendar, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { enUS, vi } from "react-day-picker/locale";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPatch } from "@/lib/api";
import type { DateTemplate, DateTemplateItem } from "@/types";
import { getTodayInTimezone } from "@/lib/datePeriod";

const dayPickerClassNames = {
  root: "p-3",
  month_caption: "flex items-center justify-between mb-3",
  caption_label: "text-slate-200 font-medium text-sm",
  nav: "flex items-center gap-1",
  button_previous:
    "p-2 rounded-lg bg-linear-card hover:bg-linear-card/80 text-slate-400 hover:text-linear-accent-hover border border-white/[0.04] hover:border-[#5E6AD2]/30 transition-all cursor-pointer",
  button_next:
    "p-2 rounded-lg bg-linear-card hover:bg-linear-card/80 text-slate-400 hover:text-linear-accent-hover border border-white/[0.04] hover:border-[#5E6AD2]/30 transition-all cursor-pointer",
  month_grid: "w-full border-collapse",
  weekdays: "border-b border-white/[0.06]",
  weekday: "text-slate-500 text-xs font-medium py-2 w-[2.25rem]",
  week: "",
  day: "p-0.5",
  day_button:
    "w-9 h-9 rounded-lg text-sm font-medium text-slate-200 hover:bg-linear-card hover:border-[#5E6AD2]/30 border border-transparent transition-all cursor-pointer flex items-center justify-center",
  selected:
    "bg-[#5E6AD2]/20 text-[#7C85E0] border-[#5E6AD2]/50 hover:bg-[#5E6AD2]/30",
  today: "border-[#5E6AD2]/40 text-[#7C85E0]",
  outside: "text-slate-600 opacity-60",
  disabled: "opacity-40 cursor-not-allowed",
};

interface DateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional: e.g. invalidate day query when saved for the selected date */
  onSaved?: (date: string) => void;
}

export function DateTemplateModal({
  isOpen,
  onClose,
  onSaved,
}: DateTemplateModalProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const [selectedDate, setSelectedDate] = useState(() => getTodayInTimezone());
  const [items, setItems] = useState<DateTemplateItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState<Record<number, string>>({});

  useEffect(() => {
    if (editingIndex !== null) editInputRef.current?.focus();
  }, [editingIndex]);

  useEffect(() => {
    if (isOpen) setSelectedDate(getTodayInTimezone());
  }, [isOpen]);

  const queryKey = ["dateTemplate", selectedDate];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiGet<{ dateTemplate: DateTemplate }>(
        API_PATHS.DATE_TEMPLATE(selectedDate)
      );
      return res.data?.dateTemplate ?? null;
    },
    enabled: isOpen && !!selectedDate,
  });

  useEffect(() => {
    if (data?.items) {
      const sorted = [...data.items].sort((a, b) => a.order - b.order);
      setItems(sorted);
    } else if (data && data.items.length === 0) {
      setItems([]);
    }
  }, [data, selectedDate]);

  const patchMutation = useMutation({
    mutationFn: (payload: { items: DateTemplateItem[] }) =>
      apiPatch<{ dateTemplate: DateTemplate }>(
        API_PATHS.DATE_TEMPLATE(selectedDate),
        payload
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["day", selectedDate] });
      setItems(variables.items);
      onSaved?.(selectedDate);
    },
  });

  const handleSelectDay = (date: Date | undefined) => {
    if (!date) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const addItem = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const next = [...items, { title: trimmed, order: items.length }];
    setItems(next);
    setNewTitle("");
  };

  const removeItem = (index: number) => {
    const next = items
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, order: i }));
    setItems(next);
  };

  const handleTitleClick = (index: number) => {
    const item = items[index];
    if (item) {
      setEditingIndex(index);
      setEditValue(item.title);
    }
  };

  const saveTitleEdit = (index: number) => {
    const trimmed = editValue.trim();
    setEditingIndex(null);
    setEditValue("");
    if (trimmed === "" || trimmed === items[index]?.title) return;
    const next = items.map((it, i) =>
      i === index ? { ...it, title: trimmed } : it
    );
    setItems(next);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue("");
  };

  const addSubTask = (index: number, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const next = items.map((it, i) =>
      i === index
        ? { ...it, subTasks: [...(it.subTasks ?? []), { title: trimmed }] }
        : it
    );
    setItems(next);
    setNewSubTaskTitle((prev) => ({ ...prev, [index]: "" }));
  };

  const deleteSubTask = (index: number, subIndex: number) => {
    const next = items.map((it, i) => {
      if (i !== index) return it;
      const subTasks = (it.subTasks ?? []).filter((_, si) => si !== subIndex);
      return { ...it, subTasks: subTasks.length > 0 ? subTasks : undefined };
    });
    setItems(next);
  };

  const handleSave = () => {
    const normalized = items
      .map((it, i) => ({
        title: it.title.trim(),
        order: i,
        ...(it.subTasks && it.subTasks.length > 0 ? { subTasks: it.subTasks } : {}),
      }))
      .filter((it) => it.title.length > 0);
    patchMutation.mutate({ items: normalized });
  };

  const normalizeForCompare = (arr: DateTemplateItem[]) =>
    arr
      .sort((a, b) => a.order - b.order)
      .map((it, i) => ({
        title: it.title.trim(),
        order: i,
        subTasks: it.subTasks ?? [],
      }))
      .filter((it) => it.title);

  const serverItems = normalizeForCompare(data?.items ?? []);
  const localNormalized = normalizeForCompare(items);
  const isDirty =
    !patchMutation.isPending &&
    JSON.stringify(localNormalized) !== JSON.stringify(serverItems);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (contentRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, onClose]);

  const locale = i18n.language === "vi" ? vi : enUS;
  const selectedDateObj = selectedDate
    ? new Date(selectedDate + "T12:00:00")
    : undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg" ref={contentRef}>
              <div className="relative bg-linear-card rounded-3xl border border-white/[0.06] shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#5E6AD2]/10">
                      <Calendar className="w-5 h-5 text-[#7C85E0]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        {t("dateTemplateModal.title")}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {t("dateTemplateModal.subtitle")}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-linear-surface transition-all duration-200"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="p-4 border-b border-white/[0.04]">
                  <p className="text-sm text-slate-400 mb-3">
                    {selectedDate}
                  </p>
                  <div className="rounded-xl border border-white/[0.06] bg-linear-surface p-2">
                    <DayPicker
                      mode="single"
                      locale={locale}
                      selected={selectedDateObj}
                      onSelect={handleSelectDay}
                      classNames={dayPickerClassNames}
                      weekStartsOn={i18n.language === "vi" ? 1 : 0}
                      components={{
                        Chevron: () => <span className="sr-only" />,
                        PreviousMonthButton: (props) => (
                          <button
                            {...props}
                            className={`${dayPickerClassNames.button_previous} ${props.className ?? ""}`}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        ),
                        NextMonthButton: (props) => (
                          <button
                            {...props}
                            className={`${dayPickerClassNames.button_next} ${props.className ?? ""}`}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        ),
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 border-b border-white/[0.04]">
                  <div className="flex gap-3">
                    <div className="relative flex-1 group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Plus className="w-5 h-5 text-slate-500 group-focus-within:text-linear-accent-hover transition-colors" />
                      </div>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addItem()}
                        placeholder={t("dateTemplateModal.addPlaceholder")}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-linear-surface border border-white/[0.04] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/40 focus:border-[#5E6AD2]/50 hover:border-white/[0.1] transition-all duration-200"
                      />
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={addItem}
                      disabled={!newTitle.trim()}
                      className="px-5 py-3 rounded-xl bg-linear-accent hover:bg-linear-accent-hover text-white font-semibold transition-all duration-200 shadow-lg shadow-[#5E6AD2]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("dateTemplateModal.add")}
                    </motion.button>
                  </div>
                </div>

                <div className="p-4 max-h-[240px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8 text-slate-500">
                      <span className="text-sm">Loading...</span>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                      <Calendar className="w-10 h-10 mb-2 opacity-30" />
                      <p>{t("dateTemplateModal.empty")}</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {items.map((item, index) => (
                          <motion.li
                            key={`${item.title}-${index}`}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="rounded-xl bg-linear-surface border border-white/[0.04] hover:bg-linear-surface/80 group transition-all duration-200"
                          >
                            <div className="flex items-center gap-3 p-3">
                              {editingIndex === index ? (
                                <input
                                  ref={editInputRef}
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveTitleEdit(index);
                                    if (e.key === "Escape") cancelEdit();
                                  }}
                                  onBlur={() => saveTitleEdit(index)}
                                  className="flex-1 min-w-0 px-0 py-0.5 bg-transparent border-none outline-none text-slate-200 focus:ring-0"
                                />
                              ) : (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => handleTitleClick(index)}
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && handleTitleClick(index)
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
                                  setExpandedIdx((prev) => (prev === index ? null : index))
                                }
                                className="p-2 rounded-lg text-slate-500 hover:text-linear-accent-hover hover:bg-linear-surface transition-all duration-200 cursor-pointer"
                              >
                                {expandedIdx === index ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </motion.button>
                              {(item.subTasks ?? []).length > 0 && expandedIdx !== index && (
                                <span className="text-xs text-[#7C85E0] font-medium">[{(item.subTasks ?? []).length}]</span>
                              )}
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => removeItem(index)}
                                className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                                aria-label={t("dateTemplateModal.deleteAria")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                            {expandedIdx === index && (
                              <div className="px-4 pb-3 pt-1 space-y-1.5 border-t border-white/[0.04]">
                                {(item.subTasks ?? []).map((st, subIdx) => (
                                  <div
                                    key={subIdx}
                                    className="flex items-center gap-3 py-1.5 pl-3 rounded-lg bg-linear-surface border border-white/[0.04]"
                                  >
                                    <span className="text-slate-500 shrink-0">•</span>
                                    <span className="flex-1 text-sm text-slate-300">
                                      {st.title}
                                    </span>
                                    <motion.button
                                      type="button"
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => deleteSubTask(index, subIdx)}
                                      className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                      aria-label={t("dateTemplateModal.deleteAria")}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </motion.button>
                                  </div>
                                ))}
                                <div className="flex gap-2 pt-1">
                                  <input
                                    type="text"
                                    value={newSubTaskTitle[index] ?? ""}
                                    onChange={(e) =>
                                      setNewSubTaskTitle((prev) => ({
                                        ...prev,
                                        [index]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        addSubTask(index, newSubTaskTitle[index] ?? "");
                                    }}
                                    placeholder={t("dayTodo.addSubTaskPlaceholder", "Add sub-task")}
                                    className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-linear-surface border border-white/[0.04] text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]/40"
                                  />
                                  <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() =>
                                      addSubTask(index, newSubTaskTitle[index] ?? "")
                                    }
                                    className="px-3 py-2 rounded-lg bg-[#5E6AD2]/20 text-[#7C85E0] text-sm font-medium hover:bg-[#5E6AD2]/30 cursor-pointer"
                                  >
                                    {t("dayTodo.addSubTask", "Add")}
                                  </motion.button>
                                </div>
                              </div>
                            )}
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </div>

                <div className="p-4 border-t border-white/[0.06] bg-slate-900/30 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!isDirty || patchMutation.isPending}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold transition-all duration-200 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {patchMutation.isPending
                      ? t("dateTemplateModal.saving")
                      : t("dateTemplateModal.save")}
                  </button>
                  <p className="text-xs text-slate-500 text-center">
                    {t("dateTemplateModal.footerTip")}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
