import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { DefaultListIcon } from "@/components/icons/DefaultListIcon";
import { ExpenseIcon } from "@/components/icons/ExpenseIcon";
import { FreetimeIcon } from "@/components/icons/FreetimeIcon";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import type { DayTodo, DayTodoItem, DayReflectionMeta, DefaultItem, ExpenseSummary, User } from "@/types";
import { getTodayInTimezone } from "@/lib/datePeriod";
import { DateNav } from "@/components/DateNav";
import { DayGoalsPanel } from "@/components/DayGoalsPanel";
import { HabitPanel } from "@/components/HabitPanel";
import { DayTodoList } from "@/components/DayTodoList";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { type DefaultOrderUpdate } from "@/components/DefaultListModal";
import { ParticleBackground } from "@/components/ParticleBackground";
import { FreetimeTodoModal } from "@/components/FreetimeTodoModal";
import { Header, type ModalKey } from "@/components/Header";
import { useIsMobile } from "@/hooks/useIsMobile";

const TemplatesHubModal = lazy(() =>
  import("@/components/TemplatesHubModal").then((m) => ({
    default: m.TemplatesHubModal,
  })),
);
const GoalModal = lazy(() =>
  import("@/components/GoalModal").then((m) => ({ default: m.GoalModal })),
);
const ReviewModal = lazy(() =>
  import("@/components/ReviewModal").then((m) => ({ default: m.ReviewModal })),
);
const ReviewHistoryModal = lazy(() =>
  import("@/components/ReviewHistoryModal").then((m) => ({
    default: m.ReviewHistoryModal,
  })),
);
const PeopleNotesModal = lazy(() =>
  import("@/components/PeopleNotesModal").then((m) => ({
    default: m.PeopleNotesModal,
  })),
);
const HabitModal = lazy(() =>
  import("@/components/HabitModal").then((m) => ({ default: m.HabitModal })),
);
const HabitStatsModal = lazy(() =>
  import("@/components/HabitStatsModal").then((m) => ({
    default: m.HabitStatsModal,
  })),
);
const ExpenseModal = lazy(() =>
  import("@/components/ExpenseModal").then((m) => ({ default: m.ExpenseModal })),
);
const SettingsModal = lazy(() =>
  import("@/components/SettingsModal").then((m) => ({
    default: m.SettingsModal,
  })),
);

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-bg-page" />
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
}

export function HomePage() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

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

  const [openModal, setOpenModal] = useState<ModalKey | null>(null);
  const [loadedModals, setLoadedModals] = useState<Partial<Record<ModalKey, true>>>(
    {},
  );
  const openM = (key: ModalKey) => {
    setLoadedModals((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    setOpenModal(key);
  };
  const closeM = () => setOpenModal(null);
  const [reviewModalSlot, setReviewModalSlot] = useState<{
    type: "week" | "month";
    period: string;
  } | null>(null);

  // Queries
  const {
    data: dayData,
    isPending: dayPending,
    isFetching: dayFetching,
  } = useQuery({
    queryKey: ["day", selectedDate],
    queryFn: async () => {
      const res = await apiGet<{ dayTodo: DayTodo }>(API_PATHS.DAY(selectedDate));
      return res.data?.dayTodo ?? null;
    },
  });

  const { data: defaultData, isPending: defaultPending } = useQuery({
    queryKey: ["default"],
    queryFn: async () => {
      const res = await apiGet<{ items: DefaultItem[] }>(API_PATHS.DEFAULT);
      return res.data?.items ?? [];
    },
  });

  const { data: dayExpenseSummary } = useQuery({
    queryKey: ["expenses-summary", selectedDate, selectedDate],
    queryFn: async () => {
      const res = await apiGet<ExpenseSummary>(
        API_PATHS.EXPENSES_SUMMARY(selectedDate, selectedDate),
      );
      return res.data;
    },
  });

  // Mutations
  // PATCH already returns the updated day, so write it straight into the
  // cache instead of invalidating (which would trigger a redundant full
  // refetch on every toggle / keystroke). Fall back to invalidate if the
  // response is unexpectedly empty.
  const applyDayResponse = (
    res: { data?: { dayTodo?: DayTodo } },
    date: string
  ) => {
    const updated = res.data?.dayTodo;
    if (updated) {
      queryClient.setQueryData(["day", date], updated);
    } else {
      queryClient.invalidateQueries({ queryKey: ["day", date] });
    }
  };

  const patchDayMutation = useMutation({
    mutationFn: async (items: DayTodoItem[]) => {
      // Pin the date at call time so a later date switch cannot make
      // onSuccess write this response into the wrong day's cache.
      const date = selectedDate;
      const res = await apiPatch<{ dayTodo: DayTodo }>(API_PATHS.DAY(date), {
        items,
      });
      return { res, date };
    },
    onSuccess: ({ res, date }) => applyDayResponse(res, date),
  });

  const patchDayMetaMutation = useMutation({
    mutationFn: async (meta: DayReflectionMeta) => {
      const date = selectedDate;
      const res = await apiPatch<{ dayTodo: DayTodo }>(API_PATHS.DAY(date), meta);
      return { res, date };
    },
    onSuccess: ({ res, date }) => applyDayResponse(res, date),
  });

  const addDefaultMutation = useMutation({
    mutationFn: ({ title, target }: { title: string; target?: number }) =>
      apiPost<{ item: DefaultItem }>(API_PATHS.DEFAULT, {
        title,
        order: defaultData?.length ?? 0,
        ...(target ? { target } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["default"] });
    },
  });

  const reorderDefaultMutation = useMutation({
    mutationFn: (updates: DefaultOrderUpdate[]) =>
      Promise.all(
        updates.map((u) => apiPatch(API_PATHS.DEFAULT_BY_ID(u.id), { order: u.order }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["default"] });
    },
  });

  const dayTodo = dayData ?? null;
  const dayListWaiting =
    dayPending || (dayFetching && !(dayTodo?.items?.length));
  const defaultItems = defaultData ?? [];

  const getSectionMotion = (desktopDelay = 0) => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: isMobile
      ? { duration: 0.18, ease: "easeOut" }
      : { duration: 0.3, delay: desktopDelay },
  });

  const handleOpenReview = () => {
    setReviewModalSlot(null);
    openM("review");
  };

  return (
    <div className="min-h-screen text-slate-100 relative">
      <AnimatedBackground />

      <Header onOpenModal={openM} onOpenReview={handleOpenReview} />

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-6 space-y-6">
        <motion.section {...getSectionMotion()}>
          <DateNav
            date={selectedDate}
            onDateChange={setSelectedDate}
            timezone={user?.timezone}
          />
        </motion.section>

        <ErrorBoundary
          key={selectedDate}
          fallback={
            <div className="rounded-xl bg-bg-card border border-danger-border p-6 text-center space-y-3">
              <p className="text-text-secondary">{t("common.errorTitle")}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-hover text-sm font-medium hover:bg-accent-primary/30 cursor-pointer"
              >
                {t("common.reload")}
              </button>
            </div>
          }
        >
          <motion.section
            {...getSectionMotion(0.05)}
            className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          >
            <DayGoalsPanel date={selectedDate} />
            <HabitPanel
              date={selectedDate}
              onManage={() => openM("habits")}
              onStats={() => openM("habitStats")}
            />
          </motion.section>

          <motion.section {...getSectionMotion(0.08)} className="flex-1">
            <DayTodoList
              dayTodo={dayTodo}
              isLoading={dayListWaiting}
              onUpdateItems={(items) => patchDayMutation.mutate(items)}
              onUpdateMeta={(meta) => patchDayMetaMutation.mutate(meta)}
            />
          </motion.section>
        </ErrorBoundary>

        <motion.section {...getSectionMotion(0.1)} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => openM("templates")}
              className="flex items-center gap-3 p-4 rounded-xl bg-bg-card/50 border border-border-default hover:border-accent-primary/30 hover:bg-bg-card/80 transition-colors text-left"
            >
              <DefaultListIcon className="w-5 h-5 shrink-0 text-accent-hover" />
              <span className="font-medium text-text-secondary">
                {t("home.templatesTitle", "Templates")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => openM("freetime")}
              className="flex items-center gap-3 p-4 rounded-xl bg-bg-card/50 border border-border-default hover:border-accent-primary/30 hover:bg-bg-card/80 transition-colors text-left"
            >
              <FreetimeIcon className="w-5 h-5 shrink-0 text-accent-hover" />
              <span className="font-medium text-text-secondary">
                {t("freetimeModal.title", "Freetime list")}
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => openM("expense")}
            className="w-full flex items-center justify-between gap-3 p-4 rounded-xl bg-bg-card border border-border-default hover:border-accent-primary/30 hover:bg-bg-card/80 transition-colors text-left"
          >
            <span className="flex items-center gap-3 min-w-0">
              <ExpenseIcon className="w-5 h-5 shrink-0 text-accent-hover" />
              <span className="font-medium text-text-secondary">
                {t("expense.title")}
              </span>
            </span>
            <span className="shrink-0 text-lg font-semibold text-white tabular-nums">
              {(dayExpenseSummary?.total ?? 0).toLocaleString("vi-VN")}đ
            </span>
          </button>
        </motion.section>
      </main>

      <Suspense fallback={null}>
        {loadedModals.templates && (
          <TemplatesHubModal
            isOpen={openModal === "templates"}
            onClose={closeM}
            defaultItems={defaultItems}
            defaultLoading={defaultPending}
            onAddItem={(title, target) =>
              addDefaultMutation.mutate({ title, target })
            }
            onInvalidate={() =>
              queryClient.invalidateQueries({ queryKey: ["default"] })
            }
            onReorder={(updates) =>
              updates.length > 0 && reorderDefaultMutation.mutate(updates)
            }
            onDateSaved={(date) => {
              if (date === selectedDate) {
                queryClient.invalidateQueries({ queryKey: ["day", selectedDate] });
              }
            }}
          />
        )}
        <FreetimeTodoModal isOpen={openModal === "freetime"} onClose={closeM} />
        {loadedModals.goal && (
          <GoalModal isOpen={openModal === "goal"} onClose={closeM} />
        )}
        {loadedModals.review && (
          <ReviewModal
            isOpen={openModal === "review"}
            onClose={() => {
              closeM();
              setReviewModalSlot(null);
            }}
            type={reviewModalSlot?.type}
            period={reviewModalSlot?.period}
            onOpenHistory={() => {
              setReviewModalSlot(null);
              openM("reviewHistory");
            }}
          />
        )}
        {loadedModals.peopleNotes && (
          <PeopleNotesModal
            isOpen={openModal === "peopleNotes"}
            onClose={closeM}
          />
        )}
        {loadedModals.habits && (
          <HabitModal isOpen={openModal === "habits"} onClose={closeM} />
        )}
        {loadedModals.habitStats && (
          <HabitStatsModal isOpen={openModal === "habitStats"} onClose={closeM} />
        )}
        {loadedModals.expense && (
          <ExpenseModal isOpen={openModal === "expense"} onClose={closeM} />
        )}
        {loadedModals.settings && (
          <SettingsModal isOpen={openModal === "settings"} onClose={closeM} />
        )}
        {loadedModals.reviewHistory && (
          <ReviewHistoryModal
            isOpen={openModal === "reviewHistory"}
            onClose={closeM}
            onOpenSlot={(type, period) => {
              setReviewModalSlot({ type, period });
              openM("review");
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
