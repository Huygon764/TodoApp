import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { CalendarPopover } from "@/components/CalendarPopover";
import { getTodayInTimezone } from "@/lib/datePeriod";

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

function localeFromLanguage(lang: string): string {
  return lang === "vi" ? "vi-VN" : "en-US";
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const dateDisplayRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      <div className="relative flex items-center gap-3 p-2 rounded-2xl bg-linear-surface border border-white/[0.06]">
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-3 rounded-xl bg-linear-card hover:bg-linear-card/80 text-slate-400 hover:text-linear-accent-hover border border-white/[0.04] hover:border-[#5E6AD2]/30 transition-all duration-200 cursor-pointer"
          onClick={() => onDateChange(addDays(date, -1))}
          aria-label={t("dateNav.prevAria")}
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        <div className="flex-1 flex justify-center relative">
          <div
            ref={dateDisplayRef}
            role="button"
            tabIndex={0}
            onClick={() => setCalendarOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && setCalendarOpen(true)}
            aria-label={t("dateNav.chooseDateAria")}
            className="relative block w-full max-w-[240px] group cursor-pointer"
          >
            <div className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-linear-card border border-white/[0.04] group-hover:border-white/[0.1] transition-all duration-200">
              <Calendar className="w-5 h-5 text-slate-500 group-hover:text-linear-accent-hover transition-colors" />
              <span className="text-slate-200 font-medium">{formatDisplayDate(date, t, locale, todayInTz, timezone)}</span>
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
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-3 rounded-xl bg-linear-card hover:bg-linear-card/80 text-slate-400 hover:text-linear-accent-hover border border-white/[0.04] hover:border-[#5E6AD2]/30 transition-all duration-200 cursor-pointer"
          onClick={() => onDateChange(addDays(date, 1))}
          aria-label={t("dateNav.nextAria")}
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
