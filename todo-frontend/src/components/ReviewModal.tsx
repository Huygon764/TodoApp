import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Trash2, FileText, History, ChevronLeft, ChevronRight } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import {
  getWeekPeriod,
  getMonthPeriod,
  formatWeekPeriodLabel,
  getPrevWeekPeriod,
  getNextWeekPeriod,
  getPrevMonthPeriod,
  getNextMonthPeriod,
} from "@/lib/datePeriod";
import type { Review } from "@/types";
import { useModalClose } from "@/hooks/useModalClose";
import { ModalContainer } from "@/components/shared/ModalContainer";
import { ModalHeader } from "@/components/shared/ModalHeader";

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
          <span className="text-text-muted mt-2.5 w-5 shrink-0">•</span>
          <input
            type="text"
            value={value}
            onChange={(e) => setAt(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 rounded-lg bg-bg-surface border border-border-subtle text-slate-100 placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          />
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => remove(i)}
            className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-bg shrink-0"
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
        className="flex items-center gap-2 text-sm text-text-muted hover:text-accent-hover transition-colors"
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
  const [slotPeriod, setSlotPeriod] = useState<string | null>(null);
  const period = typeProp
    ? (slotPeriod ?? periodProp ?? (activeTab === "week" ? getWeekPeriod() : getMonthPeriod()))
    : (periodProp ?? (activeTab === "week" ? getWeekPeriod() : getMonthPeriod()));
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
    if (!isOpen) setSlotPeriod(null);
    else if (typeProp && periodProp) setSlotPeriod(periodProp);
  }, [isOpen, typeProp, periodProp]);

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

  useModalClose(isOpen, onClose, contentRef);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} contentRef={contentRef} zBackdrop="z-40" zContent="z-50">
                <form onSubmit={handleSubmit}>
                  <ModalHeader
                    icon={<FileText className="w-5 h-5 text-accent-hover" />}
                    title={t("reviewModal.title")}
                    subtitle={activeTab === "week"
                      ? formatWeekPeriodLabel(period)
                      : t("reviewModal.monthLabel", { period })}
                    onClose={onClose}
                    extraActions={
                      <>
                        {typeProp && (
                          <div className="flex items-center gap-0.5">
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() =>
                                setSlotPeriod(
                                  activeTab === "week"
                                    ? getPrevWeekPeriod(period)
                                    : getPrevMonthPeriod(period)
                                )
                              }
                              className="p-2 rounded-xl text-text-tertiary hover:text-white hover:bg-bg-surface transition-all duration-200"
                              title={t("dateNav.prevAria", "Previous period")}
                              aria-label={t("dateNav.prevAria", "Previous period")}
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() =>
                                setSlotPeriod(
                                  activeTab === "week"
                                    ? getNextWeekPeriod(period)
                                    : getNextMonthPeriod(period)
                                )
                              }
                              className="p-2 rounded-xl text-text-tertiary hover:text-white hover:bg-bg-surface transition-all duration-200"
                              title={t("dateNav.nextAria", "Next period")}
                              aria-label={t("dateNav.nextAria", "Next period")}
                            >
                              <ChevronRight className="w-5 h-5" />
                            </motion.button>
                          </div>
                        )}
                        {onOpenHistory && (
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenHistory}
                            className="p-2 rounded-xl text-text-tertiary hover:text-white hover:bg-bg-surface transition-all duration-200"
                            title={t("reviewModal.historyTitle")}
                          >
                            <History className="w-5 h-5" />
                          </motion.button>
                        )}
                      </>
                    }
                  />

                  {!typeProp && (
                    <div className="flex border-b border-border-subtle">
                      {(["week", "month"] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActiveTab(tab)}
                          className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeTab === tab
                              ? "text-accent-hover border-b-2 border-accent-primary bg-accent-primary/5"
                              : "text-text-muted hover:text-text-secondary"
                          }`}
                        >
                          {tab === "week" ? t("goalModal.tabWeek") : t("goalModal.tabMonth")}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div>
                      <label className="block text-sm font-medium text-text-tertiary mb-2">
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
                      <label className="block text-sm font-medium text-text-tertiary mb-2">
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
                      <label className="block text-sm font-medium text-text-tertiary mb-2">
                        {t("reviewModal.notesLabel")}
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t("reviewModal.notesPlaceholder")}
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg bg-bg-surface border border-border-subtle text-slate-100 placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/40 resize-y"
                      />
                    </div>
                  </div>

                  <div className="p-4 border-t border-border-default bg-bg-page/30 flex items-center justify-between gap-3">
                    {savedMessage && (
                      <span className="text-sm text-accent-hover animate-pulse">
                        {t("reviewModal.saved")}
                      </span>
                    )}
                    <div className="flex-1" />
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={saveMutation.isPending}
                      className="px-5 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-hover text-white font-semibold transition-all disabled:opacity-50"
                    >
                      {saveMutation.isPending ? t("reviewModal.saving") : t("reviewModal.save")}
                    </motion.button>
                  </div>
                </form>
    </ModalContainer>
  );
}
