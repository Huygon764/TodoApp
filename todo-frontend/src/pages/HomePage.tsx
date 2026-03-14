import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, ListTodo, Settings, Target, Languages, CalendarRange, FileText, Calendar, Circle, Users } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import type { DayTodo, DayTodoItem, DefaultItem, User } from "@/types";
import { getTodayInTimezone } from "@/lib/datePeriod";
import { DateNav } from "@/components/DateNav";
import { DayTodoList } from "@/components/DayTodoList";
import { LogoutButton } from "@/components/LogoutButton";
import { DefaultListModal, type DefaultOrderUpdate } from "@/components/DefaultListModal";
import { RecurringTemplateModal } from "@/components/RecurringTemplateModal";
import { GoalModal } from "@/components/GoalModal";
import { ReviewModal } from "@/components/ReviewModal";
import { ReviewHistoryModal } from "@/components/ReviewHistoryModal";
import { DateTemplateModal } from "@/components/DateTemplateModal";
import { FreetimeTodoModal } from "@/components/FreetimeTodoModal";
import { PeopleNotesModal } from "@/components/PeopleNotesModal";
import { ParticleBackground } from "@/components/ParticleBackground";
import { useIsMobile } from "@/hooks/useIsMobile";

// Subtle Animated Background (solid Linear style; particles added in Phase 5)
const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-linear-bg" />
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />
      <ParticleBackground />
    </div>
  );
};

// App Logo Component
const AppLogo = () => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-9 h-9">
        <div className="relative w-full h-full bg-linear-accent rounded-xl flex items-center justify-center shadow-lg shadow-[#5E6AD2]/20">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
      </div>
      <span className="text-xl font-bold text-white">{t("appName")}</span>
    </div>
  );
};

export function HomePage() {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await apiGet<{ user: User }>(API_PATHS.AUTH_ME);
      return res.data?.user ?? null;
    },
    retry: false,
  });
  const [selectedDate, setSelectedDate] = useState(() => getTodayInTimezone());
  const hasInitializedDate = useRef(false);
  useEffect(() => {
    if (user && !hasInitializedDate.current) {
      hasInitializedDate.current = true;
      setSelectedDate(getTodayInTimezone(user.timezone));
    }
  }, [user]);
  const [isDefaultModalOpen, setIsDefaultModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReviewHistoryModalOpen, setIsReviewHistoryModalOpen] = useState(false);
  const [isDateTemplateModalOpen, setIsDateTemplateModalOpen] = useState(false);
  const [isFreetimeModalOpen, setIsFreetimeModalOpen] = useState(false);
  const [isPeopleNotesModalOpen, setIsPeopleNotesModalOpen] = useState(false);
  const [reviewModalSlot, setReviewModalSlot] = useState<{ type: "week" | "month"; period: string } | null>(null);
  const queryClient = useQueryClient();

  const toggleLang = () => {
    const next = i18n.language === "vi" ? "en" : "vi";
    i18n.changeLanguage(next);
    if (typeof localStorage !== "undefined") localStorage.setItem("lang", next);
  };

  const { data: dayData, isLoading: dayLoading } = useQuery({
    queryKey: ["day", selectedDate],
    queryFn: async () => {
      const res = await apiGet<{ dayTodo: DayTodo }>(
        API_PATHS.DAY(selectedDate)
      );
      return res.data?.dayTodo ?? null;
    },
  });

  const { data: defaultData } = useQuery({
    queryKey: ["default"],
    queryFn: async () => {
      const res = await apiGet<{ items: DefaultItem[] }>(
        API_PATHS.DEFAULT
      );
      return res.data?.items ?? [];
    },
  });

  const patchDayMutation = useMutation({
    mutationFn: (items: DayTodoItem[]) =>
      apiPatch<{ dayTodo: DayTodo }>(
        API_PATHS.DAY(selectedDate),
        { items }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["day", selectedDate] });
    },
  });

  const addDefaultMutation = useMutation({
    mutationFn: (title: string) =>
      apiPost<{ item: DefaultItem }>(API_PATHS.DEFAULT, {
        title,
        order: (defaultData?.length ?? 0),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["default"] });
    },
  });

  const reorderDefaultMutation = useMutation({
    mutationFn: (updates: DefaultOrderUpdate[]) =>
      Promise.all(
        updates.map((u) =>
          apiPatch(API_PATHS.DEFAULT_BY_ID(u.id), { order: u.order })
        )
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["default"] });
    },
  });

  const dayTodo = dayData ?? null;
  const defaultItems = defaultData ?? [];
  const iconHover = isMobile ? undefined : { scale: 1.05 };
  const iconTap = isMobile ? { scale: 0.98 } : { scale: 0.95 };
  const cardHover = isMobile ? undefined : { scale: 1.01 };
  const cardTap = isMobile ? { scale: 0.995 } : { scale: 0.99 };
  const getSectionMotion = (desktopDelay = 0) => ({
    initial: isMobile ? { opacity: 0, y: 4 } : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: isMobile
      ? { duration: 0.18, ease: "easeOut" }
      : { duration: 0.3, delay: desktopDelay },
  });

  return (
    <div className="min-h-screen text-slate-100 relative">
      <AnimatedBackground />
      
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-linear-surface">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <AppLogo />
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              whileHover={iconHover}
              whileTap={iconTap}
              onClick={toggleLang}
              className="p-2.5 rounded-xl bg-linear-card border border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.1] transition-all duration-200 cursor-pointer"
              title={i18n.language === "vi" ? "English" : "Tiếng Việt"}
            >
              <Languages className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={iconHover}
              whileTap={iconTap}
              onClick={() => setIsGoalModalOpen(true)}
              className="p-2.5 rounded-xl bg-linear-card border border-white/[0.06] text-slate-400 hover:text-linear-accent-hover hover:border-[#5E6AD2]/30 transition-all duration-200 cursor-pointer"
              title={t("home.goalsTitle")}
            >
              <Target className="w-5 h-5" />
            </motion.button>
            <motion.button
              type="button"
              whileHover={iconHover}
              whileTap={iconTap}
              onClick={() => setIsPeopleNotesModalOpen(true)}
              className="p-2.5 rounded-xl bg-linear-card border border-white/[0.06] text-slate-400 hover:text-linear-accent-hover hover:border-[#5E6AD2]/30 transition-all duration-200 cursor-pointer"
              title={t("peopleNotesModal.title")}
            >
              <Users className="w-5 h-5" />
            </motion.button>
            <motion.button
              type="button"
              whileHover={iconHover}
              whileTap={iconTap}
              onClick={() => {
                setReviewModalSlot(null);
                setIsReviewModalOpen(true);
              }}
              className="p-2.5 rounded-xl bg-linear-card border border-white/[0.06] text-slate-400 hover:text-linear-accent-hover hover:border-[#5E6AD2]/30 transition-all duration-200 cursor-pointer"
              title={t("dayTodo.reviewMyself")}
            >
              <FileText className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={iconHover}
              whileTap={iconTap}
              onClick={() => setIsDefaultModalOpen(true)}
              className="p-2.5 rounded-xl bg-linear-card border border-white/[0.06] text-slate-400 hover:text-linear-accent-hover hover:border-[#5E6AD2]/30 transition-all duration-200 cursor-pointer"
              title={t("home.defaultTemplateTitle")}
            >
              <Settings className="w-5 h-5" />
            </motion.button>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Date Navigation */}
        <motion.section
          {...getSectionMotion()}
        >
          <DateNav
            date={selectedDate}
            onDateChange={setSelectedDate}
            timezone={user?.timezone}
          />
        </motion.section>

        {/* Day Todo List - Expanded */}
        <motion.section
          {...getSectionMotion(0.05)}
          className="flex-1"
        >
          <DayTodoList
            dayTodo={dayTodo}
            isLoading={dayLoading}
            onUpdateItems={(items) => patchDayMutation.mutate(items)}
          />
        </motion.section>

        {/* Default List Button */}
        <motion.section
          {...getSectionMotion(0.1)}
        >
          <motion.button
            whileHover={cardHover}
            whileTap={cardTap}
            onClick={() => setIsDefaultModalOpen(true)}
            className="w-full p-4 rounded-2xl bg-linear-card/50 border border-white/[0.06] hover:border-[#5E6AD2]/30 hover:bg-linear-card/80 transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#5E6AD2]/10 text-[#7C85E0] group-hover:bg-[#5E6AD2]/20 transition-colors">
                  <ListTodo className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-200">{t("home.templateDefault")}</p>
                  <p className="text-sm text-slate-500">{t("home.defaultTemplateDesc", { count: defaultItems.length })}</p>
                </div>
              </div>
              <div className="text-slate-500 group-hover:text-linear-accent-hover transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </motion.button>
        </motion.section>

        {/* Date template (specific date → day todo) */}
        <motion.section
          {...getSectionMotion(0.12)}
        >
          <motion.button
            type="button"
            whileHover={cardHover}
            whileTap={cardTap}
            onClick={() => setIsDateTemplateModalOpen(true)}
            className="w-full p-4 rounded-2xl bg-linear-card/50 border border-white/[0.06] hover:border-[#5E6AD2]/30 hover:bg-linear-card/80 transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#5E6AD2]/10 text-[#7C85E0] group-hover:bg-[#5E6AD2]/20 transition-colors">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-200">{t("home.dateTemplateTitle")}</p>
                  <p className="text-sm text-slate-500">{t("home.dateTemplateDesc")}</p>
                </div>
              </div>
              <div className="text-slate-500 group-hover:text-linear-accent-hover transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </motion.button>
        </motion.section>

        {/* Freetime list (things to do when you have time) */}
        <motion.section
          {...getSectionMotion(0.14)}
        >
          <motion.button
            type="button"
            whileHover={cardHover}
            whileTap={cardTap}
            onClick={() => setIsFreetimeModalOpen(true)}
            className="w-full p-4 rounded-2xl bg-linear-card/50 border border-white/[0.06] hover:border-[#5E6AD2]/30 hover:bg-linear-card/80 transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#5E6AD2]/10 text-[#7C85E0] group-hover:bg-[#5E6AD2]/20 transition-colors">
                  <Circle className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-200">
                    {t("freetimeModal.title", "Freetime list")}
                  </p>
                  <p className="text-sm text-slate-500">
                    {t(
                      "freetimeModal.subtitle",
                      "Things you want to do when you have free time"
                    )}
                  </p>
                </div>
              </div>
              <div className="text-slate-500 group-hover:text-linear-accent-hover transition-colors">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </motion.button>
        </motion.section>

        {/* Recurring template (week/month/year → day todo) */}
        <motion.section
          {...getSectionMotion(0.15)}
        >
          <motion.button
            type="button"
            whileHover={cardHover}
            whileTap={cardTap}
            onClick={() => setIsRecurringModalOpen(true)}
            className="w-full p-4 rounded-2xl bg-linear-card/50 border border-white/[0.06] hover:border-[#5E6AD2]/30 hover:bg-linear-card/80 transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#5E6AD2]/10 text-[#7C85E0] group-hover:bg-[#5E6AD2]/20 transition-colors">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-200">{t("home.recurringTemplateTitle")}</p>
                  <p className="text-sm text-slate-500">{t("home.recurringTemplateDesc")}</p>
                </div>
              </div>
              <div className="text-slate-500 group-hover:text-linear-accent-hover transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </motion.button>
        </motion.section>
      </main>

      {/* Default List Modal */}
      <DefaultListModal
        isOpen={isDefaultModalOpen}
        onClose={() => setIsDefaultModalOpen(false)}
        items={defaultItems}
        onAddItem={(title) => addDefaultMutation.mutate(title)}
        onInvalidate={() => queryClient.invalidateQueries({ queryKey: ["default"] })}
        onReorder={(updates) => updates.length > 0 && reorderDefaultMutation.mutate(updates)}
      />

      {/* Date template modal (items for a specific date → day todo on that date) */}
      <DateTemplateModal
        isOpen={isDateTemplateModalOpen}
        onClose={() => setIsDateTemplateModalOpen(false)}
        onSaved={(date) => {
          if (date === selectedDate) {
            queryClient.invalidateQueries({ queryKey: ["day", selectedDate] });
          }
        }}
      />

      {/* Freetime todo modal */}
      <FreetimeTodoModal
        isOpen={isFreetimeModalOpen}
        onClose={() => setIsFreetimeModalOpen(false)}
      />

      {/* Recurring template modal (adds to day todo on Monday / 1st of month) */}
      <RecurringTemplateModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        initialTab="week"
      />

      {/* Goal Modal */}
      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
      />

      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setReviewModalSlot(null);
        }}
        type={reviewModalSlot?.type}
        period={reviewModalSlot?.period}
        onOpenHistory={() => {
          setIsReviewModalOpen(false);
          setReviewModalSlot(null);
          setIsReviewHistoryModalOpen(true);
        }}
      />

      {/* People Notes Modal */}
      <PeopleNotesModal
        isOpen={isPeopleNotesModalOpen}
        onClose={() => setIsPeopleNotesModalOpen(false)}
      />

      {/* Review History Modal */}
      <ReviewHistoryModal
        isOpen={isReviewHistoryModalOpen}
        onClose={() => setIsReviewHistoryModalOpen(false)}
        onOpenSlot={(type, period) => {
          setReviewModalSlot({ type, period });
          setIsReviewHistoryModalOpen(false);
          setIsReviewModalOpen(true);
        }}
      />
    </div>
  );
}
