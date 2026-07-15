import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useModalClose } from "@/hooks/useModalClose";

export interface PeriodOption {
  period: string;
  label: string;
}

interface PeriodSelectorProps {
  periodLabel: string;
  options: PeriodOption[];
  currentPeriod: string;
  pickerOpen: boolean;
  onTogglePicker: () => void;
  onClosePicker: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSelectPeriod: (period: string) => void;
}

export function PeriodSelector({
  periodLabel,
  options,
  currentPeriod,
  pickerOpen,
  onTogglePicker,
  onClosePicker,
  onPrev,
  onNext,
  onSelectPeriod,
}: PeriodSelectorProps) {
  const { t } = useTranslation();
  const pickerRef = useRef<HTMLDivElement>(null);

  useModalClose(pickerOpen, onClosePicker, pickerRef);

  return (
    <div ref={pickerRef} className="relative mt-1">
      <div className="flex items-center gap-1">
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPrev}
          className="p-1.5 rounded-lg text-text-muted hover:text-accent-hover hover:bg-bg-surface transition-colors cursor-pointer"
          aria-label={t("dateNav.prevAria")}
        >
          <ChevronLeft className="w-4 h-4" />
        </motion.button>
        <button
          type="button"
          onClick={onTogglePicker}
          className="max-w-[220px] px-2 py-1.5 rounded-lg text-sm text-text-tertiary hover:text-text-secondary hover:bg-bg-surface transition-colors text-center truncate cursor-pointer"
        >
          {periodLabel}
        </button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNext}
          className="p-1.5 rounded-lg text-text-muted hover:text-accent-hover hover:bg-bg-surface transition-colors cursor-pointer"
          aria-label={t("dateNav.nextAria")}
        >
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
      {pickerOpen && (
        <div className="absolute left-0 top-full mt-1 w-56 max-h-48 overflow-y-auto rounded-xl bg-bg-surface border border-border-default shadow-xl z-10 py-1">
          {options.map((opt) => (
            <button
              key={opt.period}
              type="button"
              onClick={() => onSelectPeriod(opt.period)}
              className={`w-full px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                opt.period === currentPeriod
                  ? "bg-accent-primary/20 text-accent-hover"
                  : "text-text-secondary hover:bg-bg-surface"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
