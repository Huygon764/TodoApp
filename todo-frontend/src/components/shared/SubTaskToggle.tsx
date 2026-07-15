import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SubTaskToggleProps {
  count: number;
  expanded: boolean;
  onClick: () => void;
  isMobile?: boolean;
}

/**
 * Single control for sub-tasks: shows the count and toggles the sub-task panel.
 * Replaces the chevron button plus separate "[n]" badge that every list used to
 * render side by side, which left no room for the title on narrow screens.
 */
export function SubTaskToggle({
  count,
  expanded,
  onClick,
  isMobile = false,
}: SubTaskToggleProps) {
  const { t } = useTranslation();

  return (
    <motion.button
      type="button"
      whileHover={isMobile ? undefined : { scale: 1.1 }}
      whileTap={isMobile ? { scale: 0.96 } : { scale: 0.9 }}
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1 rounded-full border text-xs font-semibold leading-none transition-all duration-200 cursor-pointer ${
        count > 0
          ? "px-2 py-1.5 border-accent-primary/25 bg-accent-primary/10 text-accent-hover hover:bg-accent-primary/20"
          : "p-1.5 border-transparent text-text-muted hover:text-accent-hover hover:bg-bg-surface"
      }`}
      aria-label={
        count > 0
          ? t("common.subTasksAria", { count })
          : t("common.subTasksEmptyAria")
      }
    >
      {expanded ? (
        <ChevronDown className="w-3.5 h-3.5" />
      ) : (
        <ChevronRight className="w-3.5 h-3.5" />
      )}
      {count > 0 && <span>{count}</span>}
    </motion.button>
  );
}
