import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, ListTodo, Settings, Target, Languages, CalendarRange, FileText } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import type { DayTodo, DayTodoItem, DefaultItem } from "@/types";
import { DateNav } from "@/components/DateNav";
import { DayTodoList } from "@/components/DayTodoList";
import { LogoutButton } from "@/components/LogoutButton";
import { DefaultListModal } from "@/components/DefaultListModal";
import { GoalTemplateModal } from "@/components/GoalTemplateModal";
import { GoalModal } from "@/components/GoalModal";
import { ReviewModal } from "@/components/ReviewModal";
import { ReviewHistoryModal } from "@/components/ReviewHistoryModal";

function todayString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// Subtle Animated Background
const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1a] via-[#0f172a] to-[#1a1f2e]" />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Subtle Orbs - reduced opacity and size */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
          filter: 'blur(80px)',
          top: '-5%',
          right: '-5%',
        }}
        animate={{
          y: [0, 30, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(20, 184, 166, 0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
          bottom: '10%',
          left: '-5%',
        }}
        animate={{
          y: [0, -20, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

// App Logo Component
const AppLogo = () => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-9 h-9">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl rotate-3 opacity-50 blur-[2px]" />
        <div className="relative w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
      </div>
      <span className="text-xl font-bold text-white">{t("appName")}</span>
    </div>
  );
};

export function HomePage() {
  const { t, i18n } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(todayString);
  const [isDefaultModalOpen, setIsDefaultModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReviewHistoryModalOpen, setIsReviewHistoryModalOpen] = useState(false);
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

  const dayTodo = dayData ?? null;
  const defaultItems = defaultData ?? [];

  return (
    <div className="min-h-screen text-slate-100 relative">
      <AnimatedBackground />
      
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0f172a]/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <AppLogo />
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleLang}
              className="p-2.5 rounded-xl bg-slate-800/50 border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
              title={i18n.language === "vi" ? "English" : "Tiếng Việt"}
            >
              <Languages className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsGoalModalOpen(true)}
              className="p-2.5 rounded-xl bg-slate-800/50 border border-white/[0.06] text-slate-400 hover:text-violet-400 hover:border-violet-500/30 transition-all duration-200 cursor-pointer"
              title={t("home.goalsTitle")}
            >
              <Target className="w-5 h-5" />
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setReviewModalSlot(null);
                setIsReviewModalOpen(true);
              }}
              className="p-2.5 rounded-xl bg-slate-800/50 border border-white/[0.06] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer"
              title={t("dayTodo.reviewMyself")}
            >
              <FileText className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsDefaultModalOpen(true)}
              className="p-2.5 rounded-xl bg-slate-800/50 border border-white/[0.06] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer"
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DateNav
            date={selectedDate}
            onDateChange={setSelectedDate}
          />
        </motion.section>

        {/* Day Todo List - Expanded */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setIsDefaultModalOpen(true)}
            className="w-full p-4 rounded-2xl bg-slate-800/30 border border-white/[0.06] hover:border-emerald-500/30 hover:bg-slate-800/50 transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                  <ListTodo className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-200">{t("home.templateDefault")}</p>
                  <p className="text-sm text-slate-500">{t("home.defaultTemplateDesc", { count: defaultItems.length })}</p>
                </div>
              </div>
              <div className="text-slate-500 group-hover:text-emerald-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </motion.button>
        </motion.section>

        {/* Recurring template (week start / month start → day todo) */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setIsRecurringModalOpen(true)}
            className="w-full p-4 rounded-2xl bg-slate-800/30 border border-white/[0.06] hover:border-amber-500/30 hover:bg-slate-800/50 transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-200">{t("home.recurringTemplateTitle")}</p>
                  <p className="text-sm text-slate-500">{t("home.recurringTemplateDesc")}</p>
                </div>
              </div>
              <div className="text-slate-500 group-hover:text-amber-400 transition-colors">
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
      />

      {/* Recurring template modal (adds to day todo on Monday / 1st of month) */}
      <GoalTemplateModal
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
