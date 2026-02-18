import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { DayPicker } from "react-day-picker";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { enUS, vi } from "react-day-picker/locale";

interface CalendarPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

const dayPickerClassNames = {
  root: "p-3",
  month_caption: "flex items-center justify-between mb-3",
  caption_label: "text-slate-200 font-medium text-sm",
  nav: "flex items-center gap-1",
  button_previous:
    "p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-emerald-400 border border-white/[0.04] hover:border-emerald-500/30 transition-all cursor-pointer",
  button_next:
    "p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-emerald-400 border border-white/[0.04] hover:border-emerald-500/30 transition-all cursor-pointer",
  month_grid: "w-full border-collapse",
  weekdays: "border-b border-white/[0.06]",
  weekday: "text-slate-500 text-xs font-medium py-2 w-[2.25rem]",
  week: "",
  day: "p-0.5",
  day_button:
    "w-9 h-9 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-600/50 hover:border-emerald-500/30 border border-transparent transition-all cursor-pointer flex items-center justify-center",
  selected:
    "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30",
  today: "border-emerald-500/40 text-emerald-300",
  outside: "text-slate-600 opacity-60",
  disabled: "opacity-40 cursor-not-allowed",
};

export function CalendarPopover({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  anchorRef,
}: CalendarPopoverProps) {
  const { t, i18n } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const locale = i18n.language === "vi" ? vi : enUS;

  const updatePosition = () => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  };
  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, anchorRef]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (contentRef.current?.contains(e.target as Node)) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, onClose, anchorRef]);

  const selectedDateObj = selectedDate
    ? new Date(selectedDate + "T12:00:00")
    : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onSelectDate(date.toISOString().slice(0, 10));
    onClose();
  };

  const handleTodayClick = () => {
    onSelectDate(todayString());
    onClose();
  };

  if (!isOpen) return null;

  const popoverContent = (
    <AnimatePresence>
      <motion.div
        ref={contentRef}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="fixed z-[9999] -translate-x-1/2"
        style={{ top: position.top, left: position.left }}
      >
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 blur-xl opacity-50" />
        <div className="relative rounded-2xl border border-white/[0.06] bg-slate-800/95 backdrop-blur-xl shadow-xl">
          <div className="border-b border-white/[0.06] px-3 py-2">
            <button
              type="button"
              onClick={handleTodayClick}
              className="w-full rounded-xl bg-slate-700/50 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-600/50 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              {t("dateNav.today")}
            </button>
          </div>
          <DayPicker
            mode="single"
            locale={locale}
            selected={selectedDateObj}
            onSelect={handleSelect}
            classNames={dayPickerClassNames}
            weekStartsOn={i18n.language === "vi" ? 1 : 0}
            components={{
              Chevron: () => <></>,
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
      </motion.div>
    </AnimatePresence>
  );

  return typeof document !== "undefined"
    ? createPortal(popoverContent, document.body)
    : null;
}
