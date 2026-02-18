import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, FileText, History } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { getWeekPeriod, getMonthPeriod } from "@/lib/datePeriod";
import type { Review } from "@/types";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When opening for a specific slot from history */
  type?: "week" | "month";
  period?: string;
  onOpenHistory?: () => void;
}

function ListEditor({
  items,
  onChange,
  placeholder,
  addLabel,
  deleteAria,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
  deleteAria: string;
}) {
  const add = () => onChange([...items, ""]);
  const setAt = (i: number, v: string) => {
    const next = [...items];
    next[i] = v;
    onChange(next);
  };
  const remove = (i: number) => {
    onChange(items.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-2">
      {items.map((value, i) => (
        <motion.div
          key={i}
          layout
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          className="flex gap-2"
        >
          <span className="text-slate-500 mt-2.5 w-5 shrink-0">•</span>
          <input
            type="text"
            value={value}
            onChange={(e) => setAt(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-700/50 border border-white/[0.04] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => remove(i)}
            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
            aria-label={deleteAria}
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        </motion.div>
      ))}
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={add}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-400 transition-colors"
      >
        <Plus className="w-4 h-4" />
        {addLabel}
      </motion.button>
    </div>
  );
}

export function ReviewModal({
  isOpen,
  onClose,
  type: typeProp,
  period: periodProp,
  onOpenHistory,
}: ReviewModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"week" | "month">(typeProp ?? "week");
  const period =
    periodProp ??
    (activeTab === "week" ? getWeekPeriod() : getMonthPeriod());
  const [goodThings, setGoodThings] = useState<string[]>([]);
  const [badThings, setBadThings] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [savedMessage, setSavedMessage] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const queryKey = ["review", activeTab, period];

  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiGet<{ reviews: Review[] }>(
        API_PATHS.REVIEWS_QUERY({ type: activeTab, period })
      );
      const list = res.data?.reviews ?? [];
      return list[0] ?? null;
    },
    enabled: isOpen,
  });

  const existing = data ?? null;

  useEffect(() => {
    if (typeProp) setActiveTab(typeProp);
  }, [typeProp]);

  useEffect(() => {
    if (existing) {
      setGoodThings(existing.goodThings ?? []);
      setBadThings(existing.badThings ?? []);
      setNotes(existing.notes ?? "");
    } else if (isOpen && !existing) {
      setGoodThings([]);
      setBadThings([]);
      setNotes("");
    }
  }, [isOpen, existing?._id]);

  const saveMutation = useMutation({
    mutationFn: () =>
      existing
        ? apiPatch<{ review: Review }>(API_PATHS.REVIEW(existing._id), {
            goodThings: goodThings.filter(Boolean),
            badThings: badThings.filter(Boolean),
            notes,
          })
        : apiPost<{ review: Review }>(API_PATHS.REVIEWS, {
            type: activeTab,
            period,
            goodThings: goodThings.filter(Boolean),
            badThings: badThings.filter(Boolean),
            notes,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2500);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg" ref={contentRef}>
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 rounded-3xl blur-xl opacity-50" />
              <div className="relative bg-[#1a1f2e]/95 backdrop-blur-xl rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden">
                <form onSubmit={handleSubmit}>
                  <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10">
                        <FileText className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-white">
                          {t("reviewModal.title")}
                        </h2>
                        <p className="text-sm text-slate-500">
                          {activeTab === "week"
                            ? t("reviewModal.weekLabel", { period })
                            : t("reviewModal.monthLabel", { period })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {onOpenHistory && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={onOpenHistory}
                          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
                          title={t("reviewModal.historyTitle")}
                        >
                          <History className="w-5 h-5" />
                        </motion.button>
                      )}
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
                  </div>

                  {!typeProp && (
                    <div className="flex border-b border-white/[0.04]">
                      {(["week", "month"] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActiveTab(tab)}
                          className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeTab === tab
                              ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {tab === "week" ? t("goalModal.tabWeek") : t("goalModal.tabMonth")}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        {t("reviewModal.goodLabel")}
                      </label>
                      <ListEditor
                        items={goodThings}
                        onChange={setGoodThings}
                        placeholder={t("reviewModal.goodPlaceholder")}
                        addLabel={t("reviewModal.addRow")}
                        deleteAria={t("common.deleteAria")}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        {t("reviewModal.badLabel")}
                      </label>
                      <ListEditor
                        items={badThings}
                        onChange={setBadThings}
                        placeholder={t("reviewModal.badPlaceholder")}
                        addLabel={t("reviewModal.addRow")}
                        deleteAria={t("common.deleteAria")}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        {t("reviewModal.notesLabel")}
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t("reviewModal.notesPlaceholder")}
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg bg-slate-700/50 border border-white/[0.04] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-y"
                      />
                    </div>
                  </div>

                  <div className="p-4 border-t border-white/[0.06] bg-slate-900/30 flex items-center justify-between gap-3">
                    {savedMessage && (
                      <span className="text-sm text-emerald-400 animate-pulse">
                        {t("reviewModal.saved")}
                      </span>
                    )}
                    <div className="flex-1" />
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={saveMutation.isPending}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold transition-all disabled:opacity-50"
                    >
                      {saveMutation.isPending ? t("reviewModal.saving") : t("reviewModal.save")}
                    </motion.button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
