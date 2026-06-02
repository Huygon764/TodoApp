import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  NotebookPen,
  History,
  Angry,
  Frown,
  Meh,
  Smile,
  Laugh,
} from "lucide-react";
import type { DayTodo, DayReflectionMeta, DayFlashback } from "@/types";
import { API_PATHS } from "@/constants/api";
import { apiGet } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";

const MOOD_ICONS = [Angry, Frown, Meh, Smile, Laugh];
const ENERGY_LEVELS = [1, 2, 3, 4, 5];

interface DayReflectionPanelProps {
  dayTodo: DayTodo;
  onUpdateMeta: (meta: DayReflectionMeta) => void;
}

export function DayReflectionPanel({
  dayTodo,
  onUpdateMeta,
}: DayReflectionPanelProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const [reflection, setReflection] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);

  // Reset local state only when switching to a different day. Keying on the
  // whole dayTodo would also fire on same-day cache updates (a mood tap, a todo
  // toggle, a window-focus refetch) and clobber in-progress journal/gratitude
  // typing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setReflection(dayTodo.reflection ?? "");
    setGratitude(dayTodo.gratitude ?? "");
    setMood(dayTodo.mood ?? null);
    setEnergy(dayTodo.energy ?? null);
  }, [dayTodo.date]);

  // Stable rotating question per date so it does not flicker on re-render.
  const reflectionQuestions = t("dayTodo.reflectionQuestions", {
    returnObjects: true,
  }) as string[];
  const reflectionQuestion = (() => {
    const date = dayTodo.date ?? "";
    if (!Array.isArray(reflectionQuestions) || reflectionQuestions.length === 0) {
      return "";
    }
    let sum = 0;
    for (let i = 0; i < date.length; i++) sum += date.charCodeAt(i);
    return reflectionQuestions[sum % reflectionQuestions.length];
  })();

  const moodLevels = t("dayTodo.moodLevels", { returnObjects: true }) as string[];

  const { data: flashbacks = [] } = useQuery({
    queryKey: ["flashback", dayTodo.date],
    enabled: expanded,
    queryFn: async () => {
      const res = await apiGet<{ flashbacks: DayFlashback[] }>(
        API_PATHS.DAY_FLASHBACK(dayTodo.date)
      );
      return res.data?.flashbacks ?? [];
    },
  });

  const handleMood = (level: number) => {
    const next = mood === level ? null : level;
    setMood(next);
    onUpdateMeta({ mood: next });
  };

  const handleEnergy = (level: number) => {
    const next = energy === level ? null : level;
    setEnergy(next);
    onUpdateMeta({ energy: next });
  };

  const handleReflectionBlur = () => {
    const next = reflection.trim();
    if (next === (dayTodo.reflection ?? "")) return;
    onUpdateMeta({ reflection: next });
  };

  const handleGratitudeBlur = () => {
    const next = gratitude.trim();
    if (next === (dayTodo.gratitude ?? "")) return;
    onUpdateMeta({ gratitude: next });
  };

  const hasText =
    Boolean((dayTodo.reflection ?? "").trim()) ||
    Boolean((dayTodo.gratitude ?? "").trim());
  const hasAny = hasText || dayTodo.mood != null || dayTodo.energy != null;

  const CollapsedMoodIcon =
    dayTodo.mood != null ? MOOD_ICONS[dayTodo.mood - 1] : null;

  const buttonTap = { scale: 0.9 };
  const buttonHover = isMobile ? undefined : { scale: 1.15 };

  return (
    <div className="border-t border-border-subtle">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-4 cursor-pointer
          text-text-tertiary hover:text-accent-hover transition-colors duration-200"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <NotebookPen className="w-4 h-4" />
          {t("dayTodo.reflectionTitle")}
        </span>
        <span className="flex items-center gap-2">
          {!expanded && hasAny && (
            <span className="flex items-center gap-1.5 text-accent-hover">
              {CollapsedMoodIcon && <CollapsedMoodIcon className="w-4 h-4" />}
              {hasText && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
              )}
            </span>
          )}
          <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: isMobile ? 0.16 : 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-5">
              {/* Mood */}
              <div>
                <p className="text-sm text-text-muted mb-2">
                  {t("dayTodo.moodLabel")}
                </p>
                <div className="flex items-center gap-3">
                  {MOOD_ICONS.map((Icon, idx) => {
                    const level = idx + 1;
                    const selected = mood === level;
                    return (
                      <motion.button
                        key={level}
                        type="button"
                        whileHover={buttonHover}
                        whileTap={buttonTap}
                        onClick={() => handleMood(level)}
                        aria-label={moodLevels?.[idx] ?? String(level)}
                        title={moodLevels?.[idx] ?? String(level)}
                        className={`cursor-pointer transition-colors duration-200 ${
                          selected
                            ? "text-accent-hover"
                            : "text-text-muted hover:text-accent-hover"
                        }`}
                      >
                        <Icon className="w-7 h-7" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Energy */}
              <div>
                <p className="text-sm text-text-muted mb-2">
                  {t("dayTodo.energyLabel")}
                </p>
                <div className="flex items-center gap-3">
                  {ENERGY_LEVELS.map((level) => {
                    const filled = energy != null && level <= energy;
                    return (
                      <motion.button
                        key={level}
                        type="button"
                        whileHover={buttonHover}
                        whileTap={buttonTap}
                        onClick={() => handleEnergy(level)}
                        aria-label={t("dayTodo.energyAria", { level })}
                        title={t("dayTodo.energyAria", { level })}
                        className="cursor-pointer p-1"
                      >
                        <span
                          className={`block w-3.5 h-3.5 rounded-full border-2 transition-colors duration-200 ${
                            filled
                              ? "bg-accent-primary border-accent-primary"
                              : "border-text-muted"
                          }`}
                        />
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Journal */}
              <div>
                <label className="block text-sm text-text-muted mb-2">
                  {reflectionQuestion}
                </label>
                <textarea
                  value={reflection}
                  maxLength={500}
                  rows={2}
                  onChange={(e) => setReflection(e.target.value)}
                  onBlur={handleReflectionBlur}
                  placeholder={t("dayTodo.reflectionPlaceholder")}
                  className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-subtle text-slate-100 placeholder-text-muted resize-none
                    focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary/50
                    hover:border-border-strong transition-all duration-200"
                />
              </div>

              {/* Gratitude */}
              <div>
                <label className="block text-sm text-text-muted mb-2">
                  {t("dayTodo.gratitudePrompt")}
                </label>
                <input
                  type="text"
                  value={gratitude}
                  maxLength={280}
                  onChange={(e) => setGratitude(e.target.value)}
                  onBlur={handleGratitudeBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  placeholder={t("dayTodo.gratitudePlaceholder")}
                  className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-subtle text-slate-100 placeholder-text-muted
                    focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary/50
                    hover:border-border-strong transition-all duration-200"
                />
              </div>

              {/* On this day */}
              {flashbacks.length > 0 && (
                <div>
                  <p className="flex items-center gap-2 text-sm text-text-muted mb-2">
                    <History className="w-4 h-4" />
                    {t("dayTodo.onThisDay")}
                  </p>
                  <div className="space-y-2">
                    {flashbacks.map((fb) => {
                      const FbMoodIcon =
                        fb.mood != null ? MOOD_ICONS[fb.mood - 1] : null;
                      const snippet = fb.reflection || fb.gratitude;
                      return (
                        <div
                          key={fb.key}
                          className="rounded-xl bg-bg-surface border border-border-subtle p-3"
                        >
                          <div className="flex items-center gap-2 mb-1 text-xs text-text-muted">
                            <span>
                              {fb.key === "monthAgo"
                                ? t("dayTodo.flashbackMonthAgo")
                                : t("dayTodo.flashbackYearAgo")}
                            </span>
                            <span className="text-text-faint">{fb.date}</span>
                            {FbMoodIcon && (
                              <FbMoodIcon className="w-3.5 h-3.5 text-accent-hover" />
                            )}
                          </div>
                          {snippet && (
                            <p className="text-sm text-text-secondary">{snippet}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
