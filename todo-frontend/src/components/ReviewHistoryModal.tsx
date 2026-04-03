import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { FileText, Sparkles } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost } from "@/lib/api";
import { getMonthPeriod, getWeekRangeForMonth, getMonthOptions, getWeekPeriodsInRange, getMonthsInRange, formatWeekPeriodLabel } from "@/lib/datePeriod";
import type { Review } from "@/types";
import { ReviewModal } from "./ReviewModal";
import { useModalClose } from "@/hooks/useModalClose";
import { ModalContainer } from "@/components/shared/ModalContainer";
import { ModalHeader } from "@/components/shared/ModalHeader";

const markdownComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  h2: ({ children, ...props }: React.ComponentPropsWithoutRef<"h2">) => (
    <h2 className="text-base font-semibold text-accent-hover mt-4 mb-2 first:mt-0 border-l-2 border-accent-primary/50 pl-3" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.ComponentPropsWithoutRef<"h3">) => (
    <h3 className="text-sm font-semibold text-slate-100 mt-3 mb-1.5" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }: React.ComponentPropsWithoutRef<"p">) => (
    <p className="text-sm text-text-secondary mb-2 last:mb-0" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }: React.ComponentPropsWithoutRef<"ul">) => (
    <ul className="text-sm text-text-secondary list-disc list-inside mb-2 space-y-1 marker:text-accent-hover/80" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.ComponentPropsWithoutRef<"ol">) => (
    <ol className="text-sm text-text-secondary list-decimal list-inside mb-2 space-y-1 marker:text-accent-hover/80" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: React.ComponentPropsWithoutRef<"li">) => (
    <li className="pl-1" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }: React.ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-text-secondary" {...props}>
      {children}
    </strong>
  ),
  a: ({ children, href, ...props }: React.ComponentPropsWithoutRef<"a">) => (
    <a href={href} className="text-accent-hover hover:underline" target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
};

interface ReviewHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When user clicks a slot to edit, open review modal with this type+period (parent can close history and open review) */
  onOpenSlot?: (type: "week" | "month", period: string) => void;
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
}

export function ReviewHistoryModal({
  isOpen,
  onClose,
  onOpenSlot,
}: ReviewHistoryModalProps) {
  const { t } = useTranslation();
  const currentMonth = getMonthPeriod();
  const [selectedFromMonth, setSelectedFromMonth] = useState(currentMonth);
  const [selectedToMonth, setSelectedToMonth] = useState(currentMonth);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{ type: "week" | "month"; period: string } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const fromMonth = selectedFromMonth <= selectedToMonth ? selectedFromMonth : selectedToMonth;
  const toMonth = selectedFromMonth <= selectedToMonth ? selectedToMonth : selectedFromMonth;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAnalyze = async () => {
    if (selectedIds.size === 0) return;
    setAnalysisLoading(true);
    setAnalysisResult(null);
    try {
      const res = await apiPost<{ analysis?: string; error?: string; message?: string }>(API_PATHS.REVIEWS_ANALYZE, {
        reviewIds: Array.from(selectedIds),
      });
      if (res.data?.error === "QUOTA_EXCEEDED") {
        setAnalysisResult(res.data?.message ?? "Rate limit exceeded. Please try again later.");
      } else {
        setAnalysisResult(res.data?.analysis ?? "");
      }
    } catch {
      setAnalysisResult("Analysis failed. Check GEMINI_API_KEY configuration.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", fromMonth, toMonth],
    queryFn: async () => {
      const res = await apiGet<{ reviews: Review[] }>(
        API_PATHS.REVIEWS_QUERY({ fromMonth, toMonth })
      );
      return res.data?.reviews ?? [];
    },
    enabled: isOpen,
  });

  const getReviewForSlot = (type: "week" | "month", period: string) =>
    reviews.find((r) => r.type === type && r.period === period);

  const monthPeriods = getMonthsInRange(fromMonth, toMonth);
  const slots: Array<{ type: "week" | "month"; period: string; label: string }> = [];
  const seenWeekPeriods = new Set<string>();
  for (const m of monthPeriods) {
    slots.push({ type: "month", period: m, label: formatMonthLabel(m) });
    const { from: weekFrom, to: weekTo } = getWeekRangeForMonth(m);
    for (const p of getWeekPeriodsInRange(weekFrom, weekTo)) {
      if (seenWeekPeriods.has(p)) continue;
      seenWeekPeriods.add(p);
      slots.push({ type: "week", period: p, label: formatWeekPeriodLabel(p) });
    }
  }

  const monthOptions = getMonthOptions();

  useModalClose(isOpen, onClose, contentRef);

  return (
    <>
    <ModalContainer isOpen={isOpen} onClose={onClose} contentRef={contentRef}>
                <ModalHeader
                  icon={<FileText className="w-5 h-5 text-accent-hover" />}
                  title={t("reviewHistory.title")}
                  subtitle={t("reviewHistory.subtitle")}
                  onClose={onClose}
                />

                <div className="p-4 border-b border-border-subtle space-y-3">
                  <div>
                    <label className="block text-sm text-text-tertiary mb-2">
                      {t("reviewHistory.fromMonth")}
                    </label>
                    <select
                      value={selectedFromMonth}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedFromMonth(v);
                        if (v > selectedToMonth) setSelectedToMonth(v);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-subtle text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent-primary/40 appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem', paddingRight: '2.5rem' }}
                    >
                      {monthOptions.map((ym) => (
                        <option key={ym} value={ym}>
                          {formatMonthLabel(ym)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-text-tertiary mb-2">
                      {t("reviewHistory.toMonth")}
                    </label>
                    <select
                      value={selectedToMonth}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedToMonth(v);
                        if (v < selectedFromMonth) setSelectedFromMonth(v);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-subtle text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent-primary/40 appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem', paddingRight: '2.5rem' }}
                    >
                      {monthOptions.map((ym) => (
                        <option key={ym} value={ym}>
                          {formatMonthLabel(ym)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-4 max-h-[50vh] overflow-y-auto space-y-3">
                  <>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-sm text-text-muted">
                        {t("reviewHistory.selectToAnalyze")}
                      </span>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAnalyze}
                        disabled={selectedIds.size === 0 || analysisLoading}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-primary/20 text-accent-hover hover:bg-accent-primary/30 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Sparkles className="w-4 h-4" />
                        {analysisLoading ? t("reviewHistory.analyzing") : t("reviewHistory.analyzeBtn")}
                      </motion.button>
                    </div>
                    {slots.length === 0 ? (
                      <div className="py-8 text-center text-text-muted">
                        {t("reviewHistory.empty")}
                      </div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {slots.map((slot) => {
                          const review = getReviewForSlot(slot.type, slot.period);
                          return (
                            <motion.div
                              key={`${slot.type}-${slot.period}`}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className={`p-4 rounded-xl border border-border-subtle transition-colors ${
                                review && selectedIds.has(review._id)
                                  ? "bg-accent-primary/10 border-accent-primary/30 cursor-pointer"
                                  : "bg-bg-surface/30 hover:bg-bg-surface cursor-pointer"
                              }`}
                              onClick={() => {
                                if (onOpenSlot) {
                                  onOpenSlot(slot.type, slot.period);
                                  // Do not call onClose(); parent switches to review modal, so this modal's isOpen becomes false
                                } else {
                                  setEditingSlot({ type: slot.type, period: slot.period });
                                }
                              }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                {review && (
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(review._id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleSelect(review._id);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-4 h-4 rounded border-text-muted text-accent-primary focus:ring-accent-primary"
                                  />
                                )}
                                <span className="font-medium text-accent-hover">
                                  {slot.label}
                                </span>
                                {!review && (
                                  <span className="text-xs text-text-muted">
                                    ({t("reviewHistory.noEntry")})
                                  </span>
                                )}
                              </div>
                              {review && (
                                <>
                                  {review.goodThings?.length > 0 && (
                                    <div className="text-sm text-text-secondary mb-1">
                                      <span className="text-text-muted">{t("reviewHistory.goodLabel")}: </span>
                                      {review.goodThings.join("; ")}
                                    </div>
                                  )}
                                  {review.badThings?.length > 0 && (
                                    <div className="text-sm text-text-secondary mb-1">
                                      <span className="text-text-muted">{t("reviewHistory.badLabel")}: </span>
                                      {review.badThings.join("; ")}
                                    </div>
                                  )}
                                  {review.notes && (
                                    <div className="text-sm text-text-tertiary mt-1 line-clamp-2">
                                      {review.notes}
                                    </div>
                                  )}
                                </>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                    {analysisResult !== null && (
                      <div className="mt-4 p-4 rounded-xl bg-bg-elevated border border-border-subtle overflow-y-auto max-h-[320px]">
                        <div className="text-sm font-medium text-accent-hover mb-2">
                          {t("reviewHistory.aiResponse")}
                        </div>
                        <div className="prose-invert">
                          <ReactMarkdown components={markdownComponents}>
                            {analysisResult}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </>
                </div>
    </ModalContainer>

      {editingSlot && (
        <ReviewModal
          isOpen={true}
          onClose={() => setEditingSlot(null)}
          type={editingSlot.type}
          period={editingSlot.period}
          onOpenHistory={undefined}
        />
      )}
    </>
  );
}
