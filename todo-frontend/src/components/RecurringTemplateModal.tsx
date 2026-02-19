import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, ListTodo } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiDelete, apiPatch } from "@/lib/api";
import type { RecurringTemplate } from "@/types";

/** Recurring template: week/month only; items are added to day todo on Monday / 1st of month */
type RecurringTab = "week" | "month";

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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (editingIndex !== null) editInputRef.current?.focus();
  }, [editingIndex]);

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

  const addMutation = useMutation({
    mutationFn: (title: string) =>
      apiPost<{ template: RecurringTemplate }>(API_PATHS.RECURRING_TEMPLATES, {
        type: activeTab as "week" | "month" | "year",
        title,
        order: items.length,
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

  const patchTitleMutation = useMutation({
    mutationFn: ({ idx, title }: { idx: number; title: string }) =>
      apiPatch(API_PATHS.RECURRING_TEMPLATE_ITEM(activeTab, idx), { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleTitleClick = (index: number) => {
    const item = items[index];
    if (item) {
      setEditingIndex(index);
      setEditValue(item.title);
    }
  };

  const saveRecurringTitle = (index: number) => {
    const trimmed = editValue.trim();
    setEditingIndex(null);
    setEditValue("");
    if (trimmed === "") return;
    patchTitleMutation.mutate({ idx: index, title: trimmed });
  };

  const cancelRecurringEdit = () => {
    setEditingIndex(null);
    setEditValue("");
  };

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
    if (isOpen && initialTab) setActiveTab(initialTab as RecurringTab);
  }, [isOpen, initialTab]);

  const addItem = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
    setNewTitle("");
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
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-3xl blur-xl opacity-50" />
              <div className="relative bg-[#1a1f2e]/95 backdrop-blur-xl rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10">
                      <ListTodo className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        {t("recurringModal.title")}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {t("recurringModal.subtitle")}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="flex border-b border-white/[0.04]">
                  {(["week", "month"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        activeTab === tab
                          ? "text-amber-400 border-b-2 border-amber-400 bg-amber-500/5"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {tab === "week"
                        ? t("recurringModal.tabWeek")
                        : t("recurringModal.tabMonth")}
                    </button>
                  ))}
                </div>

                <div className="p-4 border-b border-white/[0.04]">
                  <div className="flex gap-3">
                    <div className="relative flex-1 group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Plus className="w-5 h-5 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                      </div>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addItem()}
                        placeholder={t("recurringModal.addPlaceholder")}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-700/50 border border-white/[0.04] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 hover:border-slate-600 transition-all duration-200"
                      />
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={addItem}
                      disabled={!newTitle.trim() || addMutation.isPending}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold transition-all duration-200 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("recurringModal.add")}
                    </motion.button>
                  </div>
                </div>

                <div className="p-4 max-h-[300px] overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                      <ListTodo className="w-10 h-10 mb-2 opacity-30" />
                      <p>{t("recurringModal.empty")}</p>
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
                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/30 border border-white/[0.04] hover:bg-slate-700/50 group transition-all duration-200"
                          >
                            {editingIndex === index ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveRecurringTitle(index);
                                  if (e.key === "Escape") cancelRecurringEdit();
                                }}
                                onBlur={() => saveRecurringTitle(index)}
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
                              onClick={() => deleteMutation.mutate(index)}
                              disabled={deleteMutation.isPending}
                              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50"
                              aria-label={t("recurringModal.deleteAria")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </div>

                <div className="p-4 border-t border-white/[0.06] bg-slate-900/30">
                  <p className="text-xs text-slate-500 text-center">
                    {t("recurringModal.footerTip")}
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
