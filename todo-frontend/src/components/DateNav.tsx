import { useState, useRef, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { CalendarPopover } from "@/components/CalendarPopover";
import { getTodayInTimezone, localeFromLanguage } from "@/lib/datePeriod";
import { useIsMobile } from "@/hooks/useIsMobile";
import { MIN_MOBILE_DATE_FONT_PX } from "@/constants/ui";

function fitMobileDateLabel(label: HTMLElement, enabled: boolean) {
  label.style.fontSize = "";
  if (!enabled) return;
  const base = parseFloat(getComputedStyle(label).fontSize);
  let size = base;
  while (size > MIN_MOBILE_DATE_FONT_PX && label.scrollWidth > label.clientWidth + 0.5) {
    size -= 0.5;
    label.style.fontSize = `${size}px`;
  }
}

interface DateNavProps {
  date: string;
  onDateChange: (date: string) => void;
  timezone?: string;
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function getYesterdayTomorrowInTz(todayStr: string, tz?: string): { yesterday: string; tomorrow: string } {
  const d = new Date(todayStr + "T12:00:00Z");
  const prev = new Date(d);
  prev.setUTCDate(prev.getUTCDate() - 1);
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + 1);
  const fmt = (date: Date) =>
    tz?.trim()
      ? date.toLocaleDateString("en-CA", { timeZone: tz })
      : date.toLocaleDateString("en-CA");
  return { yesterday: fmt(prev), tomorrow: fmt(next) };
}

function formatDisplayDate(
  dateStr: string,
  t: (key: string) => string,
  locale: string,
  todayInTz: string,
  timezone?: string
): string {
  const { yesterday: yesterdayStr, tomorrow: tomorrowStr } = getYesterdayTomorrowInTz(todayInTz, timezone);

  const isToday = dateStr === todayInTz;
  const isYesterday = dateStr === yesterdayStr;
  const isTomorrow = dateStr === tomorrowStr;

  if (isToday) return t("dateNav.today");
  if (isYesterday) return t("dateNav.yesterday");
  if (isTomorrow) return t("dateNav.tomorrow");

  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function DateNav({ date, onDateChange, timezone }: DateNavProps) {
  const { t, i18n } = useTranslation();
  const locale = localeFromLanguage(i18n.language);
  const todayInTz = getTodayInTimezone(timezone);
  const isMobile = useIsMobile();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const dateDisplayRef = useRef<HTMLDivElement>(null);
  const dateSlotRef = useRef<HTMLDivElement>(null);
  const dateLabelRef = useRef<HTMLSpanElement>(null);
  const displayDate = formatDisplayDate(date, t, locale, todayInTz, timezone);

  useLayoutEffect(() => {
    const label = dateLabelRef.current;
    const slot = dateSlotRef.current;
    if (!label) return;

    const fit = () => fitMobileDateLabel(label, isMobile);
    fit();
    if (!slot || !isMobile) return;
    const observer = new ResizeObserver(fit);
    observer.observe(slot);
    return () => {
      observer.disconnect();
      label.style.fontSize = "";
    };
  }, [displayDate, isMobile]);

  return (
    <div className="relative">
      <div className="relative flex items-center gap-3 p-2 rounded-2xl bg-bg-surface border border-border-default">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          className="shrink-0 p-3 rounded-xl bg-bg-card hover:bg-bg-card/80 text-text-tertiary hover:text-accent-hover border border-border-subtle hover:border-accent-primary/30 transition-all duration-200 cursor-pointer"
          onClick={() => onDateChange(addDays(date, -1))}
          aria-label={t("dateNav.prevAria")}
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        <div ref={dateSlotRef} className="flex-1 min-w-0 flex justify-center relative">
          <div
            ref={dateDisplayRef}
            role="button"
            tabIndex={0}
            onClick={() => setCalendarOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && setCalendarOpen(true)}
            aria-label={t("dateNav.chooseDateAria")}
            className="relative block w-fit min-w-0 md:min-w-[240px] max-w-full group cursor-pointer"
          >
            <div className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-bg-card border border-border-subtle group-hover:border-border-strong transition-all duration-200">
              <Calendar className="w-5 h-5 shrink-0 text-text-muted group-hover:text-accent-hover transition-colors" />
              <span
                ref={dateLabelRef}
                className="min-w-0 text-text-secondary font-medium whitespace-nowrap"
              >
                {displayDate}
              </span>
            </div>
          </div>
          <CalendarPopover
            isOpen={calendarOpen}
            onClose={() => setCalendarOpen(false)}
            selectedDate={date}
            onSelectDate={(d) => {
              onDateChange(d);
              setCalendarOpen(false);
            }}
            anchorRef={dateDisplayRef}
            timezone={timezone}
          />
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          className="shrink-0 p-3 rounded-xl bg-bg-card hover:bg-bg-card/80 text-text-tertiary hover:text-accent-hover border border-border-subtle hover:border-accent-primary/30 transition-all duration-200 cursor-pointer"
          onClick={() => onDateChange(addDays(date, 1))}
          aria-label={t("dateNav.nextAria")}
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
