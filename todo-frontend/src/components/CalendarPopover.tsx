import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { DayPicker } from "react-day-picker";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { enUS, vi } from "react-day-picker/locale";
import { getTodayInTimezone } from "@/lib/datePeriod";
import { DAY_PICKER_CLASS_NAMES } from "@/constants/dayPickerStyles";

interface CalendarPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  timezone?: string;
}

export function CalendarPopover({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  anchorRef,
  timezone,
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
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    onSelectDate(`${y}-${m}-${d}`);
    onClose();
  };

  const handleTodayClick = () => {
    onSelectDate(getTodayInTimezone(timezone));
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
        <div className="relative rounded-2xl border border-border-default bg-bg-surface shadow-xl">
          <div className="border-b border-border-default px-3 py-2">
            <button
              type="button"
              onClick={handleTodayClick}
              className="w-full rounded-xl bg-bg-card px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-card/80 hover:text-accent-hover transition-colors cursor-pointer"
            >
              {t("dateNav.today")}
            </button>
          </div>
          <DayPicker
            mode="single"
            locale={locale}
            selected={selectedDateObj}
            onSelect={handleSelect}
            classNames={DAY_PICKER_CLASS_NAMES}
            weekStartsOn={i18n.language === "vi" ? 1 : 0}
            components={{
              Chevron: () => <></>,
              PreviousMonthButton: (props) => (
                <button
                  {...props}
                  className={`${DAY_PICKER_CLASS_NAMES.button_previous} ${props.className ?? ""}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              ),
              NextMonthButton: (props) => (
                <button
                  {...props}
                  className={`${DAY_PICKER_CLASS_NAMES.button_next} ${props.className ?? ""}`}
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
