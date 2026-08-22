import { useRef, useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, Trash2, Pencil, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import type { Expense, ExpenseSummary } from "@/types";
import { ModalContainer } from "@/components/shared/ModalContainer";
import { ModalHeader } from "@/components/shared/ModalHeader";
import { useModalClose } from "@/hooks/useModalClose";
import {
  getTodayInTimezone,
  getWeekDateRange,
  getWeekPeriod,
  getMonthPeriod,
  formatWeekPeriodLabel,
  formatMonthLabel,
  getPrevWeekPeriod,
  getNextWeekPeriod,
  getPrevMonthPeriod,
  getNextMonthPeriod,
} from "@/lib/datePeriod";

type PeriodTab = "day" | "week" | "month";

function formatDate(date: string): string {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function dateRangeForDay(day: string): { from: string; to: string } {
  return { from: day, to: day };
}

function dateRangeForWeek(wp: string): { from: string; to: string } {
  const { start, end } = getWeekDateRange(wp);
  return { from: start.toLocaleDateString("en-CA"), to: end.toLocaleDateString("en-CA") };
}

function dateRangeForMonth(mp: string): { from: string; to: string } {
  const [y, m] = mp.split("-").map(Number);
  const first = new Date(y!, m! - 1, 1);
  const last = new Date(y!, m!, 0);
  return { from: first.toLocaleDateString("en-CA"), to: last.toLocaleDateString("en-CA") };
}

function shiftDay(day: string, delta: number): string {
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return d.toLocaleDateString("en-CA");
}

function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

function formatAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("vi-VN");
}

function parseAmountInput(formatted: string): number {
  return Number(formatted.replace(/\D/g, "")) || 0;
}

const QUICK_AMOUNTS = [10_000, 25_000, 50_000, 100_000, 200_000];

function quickLabel(n: number): string {
  return n >= 1_000_000 ? `${n / 1_000_000}m` : `${n / 1_000}k`;
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExpenseModal({ isOpen, onClose }: ExpenseModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);
  useModalClose(isOpen, onClose, contentRef);

  const today = getTodayInTimezone();
  const [tab, setTab] = useState<PeriodTab>("day");
  const [dayAnchor, setDayAnchor] = useState(today);
  const [weekAnchor, setWeekAnchor] = useState(() => getWeekPeriod(new Date(today + "T12:00:00")));
  const [monthAnchor, setMonthAnchor] = useState(() => getMonthPeriod(new Date(today + "T12:00:00")));

  useEffect(() => {
    if (isOpen) {
      setTab("day");
      setDayAnchor(today);
      setWeekAnchor(getWeekPeriod(new Date(today + "T12:00:00")));
      setMonthAnchor(getMonthPeriod(new Date(today + "T12:00:00")));
      setAddDate(today);
      setAmount("");
      setDescription("");
      setEditId(null);
    }
  }, [isOpen]);

  const isCurrentPeriod = useMemo(() => {
    if (tab === "day") return dayAnchor === today;
    if (tab === "week") return weekAnchor === getWeekPeriod(new Date(today + "T12:00:00"));
    return monthAnchor === getMonthPeriod(new Date(today + "T12:00:00"));
  }, [tab, dayAnchor, weekAnchor, monthAnchor, today]);

  const goToday = () => {
    setDayAnchor(today);
    setWeekAnchor(getWeekPeriod(new Date(today + "T12:00:00")));
    setMonthAnchor(getMonthPeriod(new Date(today + "T12:00:00")));
  };

  const { from, to } = useMemo(() => {
    if (tab === "day") return dateRangeForDay(dayAnchor);
    if (tab === "week") return dateRangeForWeek(weekAnchor);
    return dateRangeForMonth(monthAnchor);
  }, [tab, dayAnchor, weekAnchor, monthAnchor]);

  const periodLabel = useMemo(() => {
    if (tab === "day") return formatDate(dayAnchor);
    if (tab === "week") return formatWeekPeriodLabel(weekAnchor);
    return formatMonthLabel(monthAnchor);
  }, [tab, dayAnchor, weekAnchor, monthAnchor]);

  const goPrev = () => {
    if (tab === "day") setDayAnchor((d) => shiftDay(d, -1));
    else if (tab === "week") setWeekAnchor((w) => getPrevWeekPeriod(w));
    else setMonthAnchor((m) => getPrevMonthPeriod(m));
  };

  const goNext = () => {
    if (tab === "day") setDayAnchor((d) => shiftDay(d, 1));
    else if (tab === "week") setWeekAnchor((w) => getNextWeekPeriod(w));
    else setMonthAnchor((m) => getNextMonthPeriod(m));
  };

  // Add form state
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [addDate, setAddDate] = useState(today);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const queryKey = ["expenses", from, to];

  const { data: expenses = [] } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiGet<{ expenses: Expense[] }>(API_PATHS.EXPENSES(from, to));
      return res.data?.expenses ?? [];
    },
    enabled: isOpen,
  });

  const summaryKey = ["expenses-summary", from, to];
  const { data: summary } = useQuery({
    queryKey: summaryKey,
    queryFn: async () => {
      const res = await apiGet<ExpenseSummary>(API_PATHS.EXPENSES_SUMMARY(from, to));
      return res.data;
    },
    enabled: isOpen,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: summaryKey });
  };

  const addMutation = useMutation({
    mutationFn: (data: { date: string; amount: number; description: string }) =>
      apiPost(API_PATHS.EXPENSE_CREATE, data),
    onSuccess: () => {
      invalidate();
      setAmount("");
      setDescription("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; amount?: number; description?: string }) =>
      apiPut(API_PATHS.EXPENSE_BY_ID(id), data),
    onSuccess: () => {
      invalidate();
      setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(API_PATHS.EXPENSE_BY_ID(id)),
    onSuccess: invalidate,
  });

  const handleAdd = () => {
    const amt = parseAmountInput(amount);
    if (!amt || !description.trim()) return;
    addMutation.mutate({ date: addDate, amount: amt, description: description.trim() });
  };

  const handleUpdate = () => {
    if (!editId) return;
    const amt = parseAmountInput(editAmount);
    if (!amt || !editDesc.trim()) return;
    updateMutation.mutate({ id: editId, amount: amt, description: editDesc.trim() });
  };

  const startEdit = (e: Expense) => {
    setEditId(e._id);
    setEditAmount(formatAmountInput(String(e.amount)));
    setEditDesc(e.description);
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return Array.from(map.entries());
  }, [expenses]);

  const tabs: { key: PeriodTab; label: string }[] = [
    { key: "day", label: t("expense.tabDay") },
    { key: "week", label: t("expense.tabWeek") },
    { key: "month", label: t("expense.tabMonth") },
  ];

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} contentRef={contentRef} scrollable={false}>
      <div className="shrink-0">
        <ModalHeader
          icon={<Wallet className="w-5 h-5 text-accent-hover" />}
          title={t("expense.title")}
          subtitle={t("expense.subtitle")}
          onClose={onClose}
        />
      </div>

      <div className="shrink-0 p-5 space-y-4 border-b border-border-subtle">
        {/* Add form — always visible */}
        <div className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(formatAmountInput(String(q)))}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  parseAmountInput(amount) === q
                    ? "bg-accent-primary/20 text-accent-hover border-accent-primary/40"
                    : "bg-bg-surface text-text-muted border-border-subtle hover:border-border-strong hover:text-text-secondary"
                }`}
              >
                {quickLabel(q)}
              </button>
            ))}
          </div>

          {/* Mobile: stacked, Desktop: single row */}
          <div className="flex gap-2 items-end max-sm:hidden">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                inputMode="numeric"
                placeholder={t("expense.amountPlaceholder")}
                value={amount}
                onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="w-full px-3 py-2 rounded-xl bg-bg-surface border border-border-subtle text-text-secondary text-sm focus:outline-none focus:border-accent-primary placeholder:text-text-faint"
              />
            </div>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                placeholder={t("expense.descPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="w-full px-3 py-2 rounded-xl bg-bg-surface border border-border-subtle text-text-secondary text-sm focus:outline-none focus:border-accent-primary placeholder:text-text-faint"
              />
            </div>
            <input
              type="date"
              value={addDate}
              onChange={(e) => setAddDate(e.target.value)}
              className="px-2 py-2 rounded-xl bg-bg-surface border border-border-subtle text-text-secondary text-sm focus:outline-none focus:border-accent-primary"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={addMutation.isPending}
              className="px-4 py-2 rounded-xl bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {t("expense.add")}
            </button>
          </div>

          <div className="sm:hidden space-y-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder={t("expense.amountPlaceholder")}
              value={amount}
              onChange={(e) => setAmount(formatAmountInput(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="w-full px-3 py-2 rounded-xl bg-bg-surface border border-border-subtle text-text-secondary text-sm focus:outline-none focus:border-accent-primary placeholder:text-text-faint"
            />
            <input
              type="text"
              placeholder={t("expense.descPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="w-full px-3 py-2 rounded-xl bg-bg-surface border border-border-subtle text-text-secondary text-sm focus:outline-none focus:border-accent-primary placeholder:text-text-faint"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
                className="flex-1 px-2 py-2 rounded-xl bg-bg-surface border border-border-subtle text-text-secondary text-sm focus:outline-none focus:border-accent-primary"
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={addMutation.isPending}
                className="px-4 py-2 rounded-xl bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {t("expense.add")}
              </button>
            </div>
          </div>
        </div>

        {/* Filter: tabs + period nav + total */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {tabs.map((tb) => (
              <button
                key={tb.key}
                type="button"
                onClick={() => setTab(tb.key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  tab === tb.key
                    ? "bg-accent-primary text-white border-accent-primary"
                    : "bg-bg-surface text-text-muted border-border-subtle hover:border-border-strong"
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>
          <span className="text-lg font-bold text-accent-hover">
            {formatVND(summary?.total ?? 0)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-bg-surface transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-secondary">{periodLabel}</span>
            {!isCurrentPeriod && (
              <button
                type="button"
                onClick={goToday}
                className="px-2 py-0.5 rounded-md text-xs font-medium bg-accent-primary/15 text-accent-hover hover:bg-accent-primary/25 transition-colors"
              >
                {t("dateNav.today")}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={goNext}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-bg-surface transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expense list — only this scrolls */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3">
          {grouped.length === 0 && (
            <p className="text-center text-text-muted text-sm py-6">{t("expense.empty")}</p>
          )}
          {grouped.map(([date, items]) => {
            const dayTotal = items.reduce((s, e) => s + e.amount, 0);
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-text-muted">{formatDate(date)}</span>
                  <span className="text-xs font-medium text-text-tertiary">{formatVND(dayTotal)}</span>
                </div>
                <div className="space-y-1">
                  {items.map((e) => (
                    <div
                      key={e._id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-surface border border-border-subtle group"
                    >
                      {editId === e._id ? (
                        <>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editAmount}
                            onChange={(ev) => setEditAmount(formatAmountInput(ev.target.value))}
                            onKeyDown={(ev) => ev.key === "Enter" && handleUpdate()}
                            className="w-24 px-2 py-1 rounded-lg bg-bg-card border border-border-subtle text-text-secondary text-sm focus:outline-none focus:border-accent-primary"
                          />
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(ev) => setEditDesc(ev.target.value)}
                            onKeyDown={(ev) => ev.key === "Enter" && handleUpdate()}
                            className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-bg-card border border-border-subtle text-text-secondary text-sm focus:outline-none focus:border-accent-primary"
                          />
                          <button
                            type="button"
                            onClick={handleUpdate}
                            className="p-1 text-success hover:text-success/80"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditId(null)}
                            className="p-1 text-text-muted hover:text-text-secondary"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-accent-hover shrink-0">
                            {formatVND(e.amount)}
                          </span>
                          <span className="text-sm text-text-secondary flex-1 min-w-0 truncate">
                            {e.description}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEdit(e)}
                            className="p-1 text-text-faint opacity-0 group-hover:opacity-100 hover:text-text-secondary transition-opacity"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(e._id)}
                            className="p-1 text-text-faint opacity-0 group-hover:opacity-100 hover:text-danger transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </ModalContainer>
  );
}
